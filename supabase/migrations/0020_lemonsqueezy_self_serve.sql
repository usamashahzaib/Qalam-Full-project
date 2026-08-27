BEGIN;

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_plan_check CHECK (plan IN ('Free', 'Growth', 'Solo', 'Pro', 'Agency'));
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_check CHECK (plan IN ('Free', 'Growth', 'Solo', 'Pro', 'Agency'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('stripe', 'jazzcash', 'easypaisa', 'lemon_squeezy'));
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_plan_name_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_plan_name_check CHECK (plan_name IN ('Free', 'Growth', 'Solo', 'Pro', 'Agency'));
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_billing_cycle_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual'));

COMMIT;
