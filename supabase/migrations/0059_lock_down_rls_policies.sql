-- ----------------------------------------------------------------
-- Lock the database to service-role access only.
--
-- WHAT THE AUDIT FIRST CLAIMED, AND WHAT IS ACTUALLY TRUE
--
-- 0024_admin_rls_and_plan_sync.sql and 0026_fix_approvals_schema.sql contain
-- policies written as USING (true) with no TO clause on user_overrides,
-- plan_usage, and approvals. Read from the migration files alone that is a
-- paywall bypass and a cross-tenant read of every unpublished draft.
--
-- Querying the live database (scripts/check-rls.mjs) shows those policies are
-- NOT what production is running. Production has the schema_final.sql shapes:
--
--   user_overrides        ALL     USING (false)
--   plan_usage            SELECT  USING (user_id = auth.uid()::text)   -- no write policy
--   approvals             ALL     USING (requester_id = auth.uid()::text)
--   password_resets       ALL     USING (false)
--   email_verifications   ALL     USING (false)
--
-- So the three specific attacks do not work against production. Either 0024
-- and 0026 were never applied, or schema_final.sql was replayed over them.
--
-- THE REAL PROBLEM
--
-- anon and authenticated hold DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE, and UPDATE on roughly 35 public tables, including payments,
-- payment_subscriptions, linkedin_credentials, user_overrides,
-- email_verifications, password_resets, and workspace_invites. RLS is the only
-- thing standing between the anon key and those rows.
--
-- Those policies hold for one reason: they are predicated on auth.uid(), the
-- app authenticates with NextAuth, and auth.users is empty (0 rows). auth.uid()
-- is therefore always NULL, every predicate evaluates to NULL, and NULL is not
-- true, so access is denied. The database is safe today by arithmetic, not by
-- design.
--
-- That inverts the moment anyone issues a Supabase JWT for any reason: realtime,
-- storage, or a client-side query. auth.uid() starts returning a real value and
-- policies like linkedin_credentials ALL USING (user_id = auth.uid()) become
-- live client-side read access to encrypted LinkedIn tokens.
--
-- THE FIX
--
-- Verified before writing this: nothing uses the anon key. No client component
-- constructs a Supabase client, there is no .storage or .channel call anywhere,
-- no supabase.auth call anywhere, env.supabasePublishableKey is read by nothing,
-- and auth.users is empty. Every read and write in the app goes through
-- createServiceClient(), including the token-gated public approval review
-- routes. Revoking these grants cannot break a code path that exists.
--
-- End state: no grants to anon or authenticated, RLS still enabled so the
-- tables stay deny-by-default if privileges are ever re-granted, and default
-- privileges revoked so the next CREATE TABLE does not silently reintroduce
-- the same grants. A future client-side feature re-grants deliberately and
-- writes a real policy for it.
-- ----------------------------------------------------------------

-- 1. Drop the stale policies on the three audited tables.
--
-- Production has the harmless schema_final shapes, but any environment where
-- 0024/0026 did land is running USING (true), and this file has to correct both.
-- A loop rather than named DROP statements because policies created from the
-- Supabase dashboard never appear in this directory, so an explicit list would
-- silently miss them. Dropping the scoped ones too is intentional: with the
-- grants revoked below they are unreachable, and an empty policy set means a
-- future re-GRANT fails closed instead of quietly restoring partial access.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_overrides', 'plan_usage', 'approvals')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- 2. Revoke anon and authenticated privileges on every public table.
--
-- Not just the three audited tables: the same broad grant exists across the
-- whole schema, and leaving 32 tables reachable while fixing 3 would be a
-- false sense of completion. RLS is left enabled underneath as a second layer.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 3. Stop the grants coming back on the next CREATE TABLE.
-- Supabase's default privileges are what handed anon and authenticated full DML
-- on every table above; without this, migration 0060 reintroduces the problem.

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 4. Keep RLS enabled on the audited tables so they remain deny-by-default.
-- Idempotent - already enabled in production.

ALTER TABLE public.user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_usage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals      ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Verify against the live database, never against this file. That distinction
-- is the whole reason this migration says something different from the audit
-- that prompted it.
--
--   npm run check:rls
--
-- Expect: 0 findings, and every service-only table listed as having no
-- policies and no grants.
-- ----------------------------------------------------------------
