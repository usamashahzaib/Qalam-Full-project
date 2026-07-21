-- Migration 0051: allow 'lemonsqueezy' as a payments.provider
--
-- The payments table was created (migration 0006) with
--   CHECK (provider IN ('stripe','jazzcash','easypaisa'))
-- so every Lemon Squeezy webhook insert was rejected with a check_violation,
-- the webhook 500'd, and the plan was never activated even though the customer
-- had paid. Widen the constraint to include 'lemonsqueezy'.

BEGIN;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('stripe', 'jazzcash', 'easypaisa', 'lemonsqueezy'));

COMMIT;
