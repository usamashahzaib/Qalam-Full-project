-- Referral commission automation. Extends the existing manual referral system
-- (0043-0045) instead of replacing it: referral_uses already tracks one row per
-- referred user with a "paid" status the admin sets by hand after verifying a
-- JazzCash/Easypaisa screenshot. This adds a commission accrued on that same row
-- so the automated Lemon Squeezy webhook can credit it too (first payment only),
-- plus a payout request queue so the referrer can cash out - still gated behind
-- admin approval before any money actually moves.

ALTER TABLE public.referral_uses
    ADD COLUMN IF NOT EXISTS commission_percent INTEGER NOT NULL DEFAULT 10
        CHECK (commission_percent >= 0 AND commission_percent <= 100);
ALTER TABLE public.referral_uses
    ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (commission_amount >= 0);

CREATE TABLE IF NOT EXISTS public.referral_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('jazzcash', 'easypaisa', 'bank')),
    account_details TEXT NOT NULL,
    payment_reference TEXT,
    admin_note TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON public.referral_payouts(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON public.referral_payouts(status);

-- Deny-by-default, matching 0059: schema-level default privileges already keep
-- anon/authenticated off new tables, this just keeps RLS itself on so the table
-- stays deny-by-default if privileges are ever re-granted. Every read/write goes
-- through createServiceClient(), same as the rest of the referral system.
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- Cascade the GDPR deletion coverage from 0045: referral_payouts.referrer_user_id
-- is ON DELETE CASCADE, so deleting the users row (delete_user_data's last step)
-- removes any payout requests automatically. No function change needed.
