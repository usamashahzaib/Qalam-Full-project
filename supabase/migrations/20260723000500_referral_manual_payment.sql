-- Simplifies referrals to a manual payment flow: no automatic checkout/webhook
-- integration. Admin confirms payment manually and marks the referral_uses row paid.

ALTER TABLE public.payments DROP COLUMN IF EXISTS referral_discount_percent;
ALTER TABLE public.payments DROP COLUMN IF EXISTS final_amount;
ALTER TABLE public.payments DROP COLUMN IF EXISTS referral_id;
DROP INDEX IF EXISTS idx_payments_referral;

ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'paid'));
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.referral_uses ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_referral_uses_status ON public.referral_uses(status);
