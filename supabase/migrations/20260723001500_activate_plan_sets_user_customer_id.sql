-- Migration 0055: activate_plan() must also stamp users.customer_id
--
-- lib/server/payments.ts always calls activate_plan with p_customer_id (the
-- Lemon Squeezy subscription ID, or the transaction ID for one-off orders),
-- but the RPC (0031_atomic_provisioning_and_payment_fixes.sql) only ever
-- wrote it to organizations.customer_id - personal-workspace users (no org)
-- never got it persisted at all when the RPC succeeded, only via the JS
-- fallback path taken when the RPC is missing/broken. Any logic keyed off
-- "which subscription is this user currently on" (e.g. distinguishing a
-- superseded subscription from the active one during an upgrade) needs this
-- column to be reliably populated on every activation, not just the rare
-- fallback path.

CREATE OR REPLACE FUNCTION public.activate_plan(
  p_user_id        UUID,
  p_organization_id UUID,       -- nullable; personal workspace users have no org
  p_plan_name      TEXT,
  p_expires_at     TIMESTAMPTZ,
  p_customer_id    TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  -- Always update the user record (source of truth for plan resolution)
  UPDATE public.users
  SET    plan           = p_plan_name,
         plan_expires_at = p_expires_at,
         customer_id    = COALESCE(p_customer_id, customer_id),
         updated_at     = now()
  WHERE  id = p_user_id;

  -- Update org only when the user belongs to one
  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET    plan                = p_plan_name,
           subscription_status = 'active',
           plan_expires_at     = p_expires_at,
           customer_id         = p_customer_id,
           updated_at          = now()
    WHERE  id = p_organization_id;
  END IF;

  -- Keep plan_usage in sync (best-effort; never block payment on this)
  INSERT INTO public.plan_usage (user_id, plan, updated_at)
  VALUES (p_user_id::TEXT, lower(p_plan_name), now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = lower(excluded.plan), updated_at = now();
END;
$$;
