-- Repair the production billing activation contract.
--
-- The previous activate_plan() implementation referenced users.customer_id,
-- although no migration created that column. It also omitted billing-cycle and
-- quota-window fields that the application uses for annual-plan enforcement.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS customer_id TEXT;

CREATE INDEX IF NOT EXISTS users_customer_id_idx
  ON public.users (customer_id)
  WHERE customer_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.activate_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT);

CREATE FUNCTION public.activate_plan(
  p_user_id         UUID,
  p_organization_id UUID,
  p_plan_name       TEXT,
  p_expires_at      TIMESTAMPTZ,
  p_customer_id     TEXT,
  p_billing_cycle   TEXT
) RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_cycle TEXT := lower(COALESCE(p_billing_cycle, 'monthly'));
BEGIN
  IF p_plan_name NOT IN ('Solo', 'Pro') THEN
    RAISE EXCEPTION 'invalid paid plan: %', p_plan_name;
  END IF;

  IF v_cycle NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'invalid billing cycle: %', p_billing_cycle;
  END IF;

  UPDATE public.users
  SET plan             = p_plan_name,
      plan_expires_at  = p_expires_at,
      plan_started_at  = v_now,
      billing_cycle    = v_cycle,
      customer_id      = COALESCE(p_customer_id, customer_id),
      reminder_sent_3d = false,
      reminder_sent_1d = false,
      updated_at       = v_now
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found: %', p_user_id;
  END IF;

  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET plan                = p_plan_name,
        subscription_status = 'active',
        plan_expires_at     = p_expires_at,
        customer_id         = p_customer_id,
        updated_at          = v_now
    WHERE id = p_organization_id;
  END IF;

  INSERT INTO public.plan_usage (
    user_id,
    plan,
    cycle_start,
    cycle_end,
    updated_at
  )
  VALUES (
    p_user_id::TEXT,
    lower(p_plan_name),
    v_now,
    p_expires_at,
    v_now
  )
  ON CONFLICT (user_id) DO UPDATE
  SET plan        = EXCLUDED.plan,
      cycle_start = EXCLUDED.cycle_start,
      cycle_end   = EXCLUDED.cycle_end,
      updated_at  = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT)
  TO service_role;
