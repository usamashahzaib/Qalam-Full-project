-- Migration 0052: persist provider subscription IDs
--
-- Why:
-- 1. Renewal webhooks (Lemon Squeezy subscription_payment_success) carry no
--    variant_id, so the plan was previously resolved from meta.custom_data -
--    which originates in a checkout URL the buyer controls in their browser.
--    A tampered checkout[custom][plan_name] would silently upgrade the plan on
--    the first renewal. payment_subscriptions stores the plan mapping that was
--    established from the SIGNED variant_id, so renewals never trust the buyer.
-- 2. payments.customer_id was being set to the order/invoice ID, which changes
--    every cycle, leaving no stable handle for cancellation or reconciliation.
-- 3. Refunds need a distinct terminal status so access can be revoked.

BEGIN;

-- ----------------------------------------------------------------
-- 1. Stable subscription handle on each payment row
-- ----------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_id TEXT;

CREATE INDEX IF NOT EXISTS payments_subscription_id_idx
  ON public.payments (provider, subscription_id)
  WHERE subscription_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 2. Allow 'refunded' as a terminal payment status
-- ----------------------------------------------------------------
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('paid', 'failed', 'cancelled', 'refunded'));

-- ----------------------------------------------------------------
-- 3. Subscription -> plan mapping, established from signed variant IDs only
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_subscriptions (
    id              uuid primary key default gen_random_uuid(),
    provider        text not null check (provider in ('stripe', 'lemonsqueezy')),
    subscription_id text not null,
    user_id         uuid references public.users(id) on delete set null,
    organization_id uuid references public.organizations(id) on delete set null,
    plan_name       text not null check (plan_name in ('Free', 'Solo', 'Pro', 'Agency')),
    billing_cycle   text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
    status          text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'refunded')),
    renews_at       timestamptz,
    ends_at         timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique(provider, subscription_id)
);

CREATE INDEX IF NOT EXISTS payment_subscriptions_user_idx
  ON public.payment_subscriptions (user_id);

ALTER TABLE public.payment_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions; all writes go through the service role.
DROP POLICY IF EXISTS "payment_subscriptions_own_select" ON public.payment_subscriptions;
CREATE POLICY "payment_subscriptions_own_select" ON public.payment_subscriptions
  FOR SELECT USING (user_id::text = auth.uid()::text);

COMMIT;
