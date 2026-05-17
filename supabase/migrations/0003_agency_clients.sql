-- Supabase Migration: 0003_agency_clients.sql
-- Enables Agency Hub functionality to manage 50+ clients without using fake data.

CREATE TABLE IF NOT EXISTS public.agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'Standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agency_clients_email ON public.agency_clients(agency_email);

ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be enforced through the Supabase service role for now
-- since the app uses custom JWT sessions via the proxy.
REVOKE ALL ON public.agency_clients FROM anon, authenticated;
