-- Stored procedure for atomic plan activation across users, organizations, and plan_usage tables.
CREATE OR REPLACE FUNCTION activate_plan(
  p_user_id uuid,
  p_org_id uuid,
  p_plan text,
  p_expires_at timestamptz,
  p_customer_id text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Update users table
  UPDATE public.users
  SET plan = p_plan,
      plan_expires_at = p_expires_at,
      updated_at = now()
  WHERE id = p_user_id;

  -- Update organizations table
  UPDATE public.organizations
  SET plan = p_plan,
      subscription_status = 'active',
      plan_expires_at = p_expires_at,
      customer_id = p_customer_id,
      updated_at = now()
  WHERE id = p_org_id;

  -- Upsert plan_usage table
  INSERT INTO public.plan_usage (user_id, plan, updated_at)
  VALUES (p_user_id, lower(p_plan), now())
  ON CONFLICT (user_id)
  DO UPDATE SET plan = lower(excluded.plan), updated_at = now();
END;
$$;
