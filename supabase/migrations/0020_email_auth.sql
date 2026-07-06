-- Migration: 0020_email_auth.sql
-- Adds email/password authentication support alongside existing LinkedIn OAuth.
-- Safe to run multiple times (idempotent).

-- ── 1. Extend users table ────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash    text,
  ADD COLUMN IF NOT EXISTS email_verified   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_provider    text    NOT NULL DEFAULT 'linkedin',
  ADD COLUMN IF NOT EXISTS role             text;

-- For fast email lookup during credentials login
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key
  ON public.users (email)
  WHERE email IS NOT NULL AND email <> '';

-- ── 2. Password resets table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.password_resets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON public.password_resets (token_hash);

CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON public.password_resets (user_id);

-- ── 3. Email verifications table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_verifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz          DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token
  ON public.email_verifications (token_hash);

-- ── 4. RLS - service role only (tokens are secrets) ─────────────────────────

ALTER TABLE public.password_resets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Drop before recreate for idempotency
DROP POLICY IF EXISTS "No direct access" ON public.password_resets;
DROP POLICY IF EXISTS "No direct access" ON public.email_verifications;

-- These tables are only accessed via service role key in API routes.
-- The USING (false) policy blocks all RLS-checked access, which does not
-- apply to the service_role role (it bypasses RLS).
CREATE POLICY "No direct access" ON public.password_resets
  FOR ALL USING (false);

CREATE POLICY "No direct access" ON public.email_verifications
  FOR ALL USING (false);
