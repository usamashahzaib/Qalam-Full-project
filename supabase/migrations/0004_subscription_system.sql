-- ============================================================
-- Migration 0004: Subscription System
-- Adds plan enforcement columns, session version, and audit log
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. organizations — rename billing_plan → plan (idempotent)
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'organizations'
      AND column_name  = 'billing_plan'
  ) THEN
    ALTER TABLE public.organizations RENAME COLUMN billing_plan TO plan;
  END IF;
END $$;

-- Ensure plan column exists even if neither name was present
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Free';

-- Backfill nulls before adding NOT NULL
UPDATE public.organizations SET plan = 'Free' WHERE plan IS NULL;

ALTER TABLE public.organizations ALTER COLUMN plan SET NOT NULL;
ALTER TABLE public.organizations ALTER COLUMN plan SET DEFAULT 'Free';

-- ----------------------------------------------------------------
-- 2. organizations — plan CHECK constraint
-- ----------------------------------------------------------------
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('Free', 'Solo', 'Pro', 'Agency Starter', 'Agency Growth'));

-- ----------------------------------------------------------------
-- 3. organizations — subscription_status
-- ----------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active';

UPDATE public.organizations
  SET subscription_status = 'active'
  WHERE subscription_status NOT IN ('active', 'trialing', 'past_due', 'canceled', 'paused');

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'paused'));

-- ----------------------------------------------------------------
-- 4. organizations — billing metadata columns
-- ----------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS customer_id text;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_customer_id_key;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_customer_id_key UNIQUE (customer_id);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- ----------------------------------------------------------------
-- 5. users — session_version (for instant session invalidation)
-- ----------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------
-- 6. plan_audit_log — immutable change history
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_audit_log (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  changed_by      text,
  old_plan        text,
  new_plan        text,
  old_status      text,
  new_status      text,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_audit_log ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 7. Trigger — auto-log plan/status changes + refresh plan_updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_track_plan_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan
     OR OLD.subscription_status IS DISTINCT FROM NEW.subscription_status
  THEN
    INSERT INTO public.plan_audit_log
      (organization_id, old_plan, new_plan, old_status, new_status)
    VALUES
      (NEW.id, OLD.plan, NEW.plan, OLD.subscription_status, NEW.subscription_status);

    NEW.plan_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_change ON public.organizations;

CREATE TRIGGER trg_plan_change
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_track_plan_change();

-- ----------------------------------------------------------------
-- 8. Index for fast plan + status lookups
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organizations_plan_status
  ON public.organizations (plan, subscription_status);

COMMIT;
