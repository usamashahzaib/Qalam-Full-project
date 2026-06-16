-- Fix approvals table: original schema.sql created a minimal stub.
-- Migration 0022 used CREATE TABLE IF NOT EXISTS so columns were never added.
-- This migration adds all required columns for the email-based approval workflow.

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS requester_id TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS reviewer_email TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS post_title TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS post_content TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS message TEXT;

-- post_id is now optional (approvals can be created without a saved post)
ALTER TABLE public.approvals ALTER COLUMN post_id DROP NOT NULL;

-- Ensure RLS allows service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'approvals' AND policyname = 'service_approvals_all'
  ) THEN
    CREATE POLICY "service_approvals_all" ON public.approvals FOR ALL USING (true);
  END IF;
END$$;

-- Index for requester queries
CREATE INDEX IF NOT EXISTS approvals_requester_id_idx ON public.approvals (requester_id, created_at DESC);
