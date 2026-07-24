-- publishing_accounts was referenced by app code (lib/server/linkedin-credentials.ts)
-- but was never actually created against production - schema_final.sql (the real
-- baseline; see the 0001_relational_workspace.sql tombstone) only defines
-- linkedin_credentials. Create it now so LinkedIn connect stops failing with
-- "relation public.publishing_accounts does not exist".
CREATE TABLE IF NOT EXISTS public.publishing_accounts (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider                 TEXT        NOT NULL DEFAULT 'linkedin',
  provider_account_id      TEXT        NOT NULL,
  access_token             TEXT,
  refresh_token            TEXT,
  expires_at               TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_publishing_accounts_workspace ON public.publishing_accounts (workspace_id);

ALTER TABLE public.publishing_accounts ENABLE ROW LEVEL SECURITY;
-- No policies added: this table (like linkedin_credentials) is only ever read/written
-- via the service-role key in lib/server/supabase-rest.ts, which bypasses RLS. Enabling
-- RLS with no policies means anon/authenticated keys get zero access by default.

-- LinkedIn now issues a refresh token alongside the 60-day access token.
-- Store it (encrypted, like access_token) so tokens can be renewed without
-- forcing the user to manually reconnect every 2 months.
ALTER TABLE public.linkedin_credentials
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at BIGINT;
