-- Migration 0037: Security gap fixes + missing column backfill
--
-- Fixes three issues found in the schema audit:
-- 1. workspaces.owner_email column was never added by any migration
--    but provision_oauth_user RPC inserts it — without this column
--    every new user registration fails with a column-not-found error.
-- 2. competitor_analyses had USING(true) — any authenticated user
--    could read every other user's competitive research history.
-- 3. carousels had USING(true) WITH CHECK(true) — any authenticated
--    user could read and write carousel data for other users.
-- 4. review_token_hash column added to approvals (added by 0027 but
--    may be missing if 0027 did not run cleanly after schema changes).

-- ----------------------------------------------------------------
-- 1. workspaces.owner_email
-- ----------------------------------------------------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- ----------------------------------------------------------------
-- 2. Fix competitor_analyses RLS (was USING(true))
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "service_competitor_all" ON public.competitor_analyses;
DROP POLICY IF EXISTS "competitor_analyses_own"  ON public.competitor_analyses;

CREATE POLICY "competitor_analyses_own" ON public.competitor_analyses
  FOR ALL USING (user_id = auth.uid()::text);

-- ----------------------------------------------------------------
-- 3. Fix carousels RLS (was USING(true) WITH CHECK(true))
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Service role full access" ON public.carousels;
DROP POLICY IF EXISTS "carousels_own"             ON public.carousels;

CREATE POLICY "carousels_own" ON public.carousels
  FOR ALL
  USING     (user_id = auth.uid()::text)
  WITH CHECK(user_id = auth.uid()::text);

-- ----------------------------------------------------------------
-- 4. approvals.review_token_hash (idempotent)
-- ----------------------------------------------------------------
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS review_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_approvals_token_hash
  ON public.approvals (review_token_hash)
  WHERE review_token_hash IS NOT NULL;

-- ----------------------------------------------------------------
-- 5. plan_usage.competitor_runs_used (idempotent)
-- ----------------------------------------------------------------
ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS competitor_runs_used INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------
-- 6. carousels.theme / carousels.color (used by carousel studio)
-- ----------------------------------------------------------------
ALTER TABLE public.carousels ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.carousels ADD COLUMN IF NOT EXISTS color TEXT;

-- ----------------------------------------------------------------
-- 7. workspaces.slug (used by provision_oauth_user RPC)
-- ----------------------------------------------------------------
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug TEXT;
