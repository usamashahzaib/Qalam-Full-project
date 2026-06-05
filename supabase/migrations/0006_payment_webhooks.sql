BEGIN;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('Free', 'Solo', 'Pro', 'Agency'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'Free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('Free', 'Solo', 'Pro', 'Agency'));

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'jazzcash', 'easypaisa')),
  transaction_id text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  plan_name text NOT NULL CHECK (plan_name IN ('Free', 'Solo', 'Pro', 'Agency')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  status text NOT NULL CHECK (status IN ('paid', 'failed', 'cancelled')),
  raw_payload jsonb NOT NULL DEFAULT '{}',
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, transaction_id)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_own_select" ON public.payments;

CREATE POLICY "payments_own_select" ON public.payments
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON public.payments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction
  ON public.payments (provider, transaction_id);

COMMIT;
