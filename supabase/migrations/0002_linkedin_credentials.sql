-- Supabase Migration: 0002_linkedin_credentials.sql
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
