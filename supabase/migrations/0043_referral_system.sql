-- Per-colleague referral tracking: unique codes, click tracking, conversion tracking,
-- discount propagation into plan_usage and payments.

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    referrer_name TEXT NOT NULL,
    referrer_email TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL DEFAULT 20 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    ip_hash TEXT,
    user_agent TEXT,
    landing_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    discount_applied INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_usage ADD COLUMN IF NOT EXISTS referral_discount_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS referral_discount_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS final_amount NUMERIC(12,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_email ON public.referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral ON public.referral_clicks(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referral ON public.referral_uses(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred_user ON public.referral_uses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_referral ON public.payments(referral_id);
