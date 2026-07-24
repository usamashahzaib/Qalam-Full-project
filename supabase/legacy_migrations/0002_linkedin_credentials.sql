-- ================================================================
-- DEPRECATED - DO NOT RUN
-- 0002_linkedin_credentials.sql
-- ================================================================
-- This file creates linkedin_credentials with owner_email TEXT as PK.
-- schema_final.sql creates it correctly with user_id UUID FK UNIQUE.
-- Running this file would create an incompatible schema.
-- Superseded by: schema_final.sql
-- ================================================================
-- Original description:
-- Moves LinkedIn access tokens from the session cookie to server-side storage.
-- This fixes: (a) raw token in cookie security concern, (b) cron architecture (no cookies in server-to-server calls).

CREATE TABLE IF NOT EXISTS public.linkedin_credentials (
  owner_email TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  member_id TEXT,
  token_expires_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.linkedin_credentials ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (server-side only)
REVOKE ALL ON public.linkedin_credentials FROM anon, authenticated;
