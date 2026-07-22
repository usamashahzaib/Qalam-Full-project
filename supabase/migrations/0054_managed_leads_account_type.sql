-- Managed Services applications need to distinguish an individual applying
-- for themselves from a company applying on behalf of a team, since the
-- form fields, required data (company name, team size), and outreach differ.
ALTER TABLE public.managed_leads
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'company')),
  ADD COLUMN IF NOT EXISTS team_size TEXT;
