-- Migration 0031: Atomic user provisioning RPC + payment pipeline fixes
--
-- Fixes:
-- 1. provision_oauth_user: single atomic transaction for new user setup
-- 2. activate_plan: rename params to match payments.ts, handle null org_id
-- 3. organizations plan CHECK: add 'Agency' to allowed values

-- ----------------------------------------------------------------
-- 1. Fix organizations plan CHECK constraint to include 'Agency'
-- ----------------------------------------------------------------
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('Free', 'Solo', 'Pro', 'Agency', 'Agency Starter', 'Agency Growth'));

-- ----------------------------------------------------------------
-- 2. provision_oauth_user: atomic 4-table insert, idempotent
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_oauth_user(
  p_external_id TEXT,
  p_email       TEXT,
  p_full_name   TEXT,
  p_image_url   TEXT
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_user_id      UUID;
  v_workspace_id UUID;
BEGIN
  -- Idempotent: return existing IDs if this external_id was already provisioned
  SELECT u.id, wm.workspace_id
  INTO   v_user_id, v_workspace_id
  FROM   public.users u
  LEFT JOIN public.workspace_members wm ON wm.user_id = u.id
  WHERE  u.external_user_id = p_external_id
  ORDER  BY wm.created_at DESC NULLS LAST
  LIMIT  1;

  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
  END IF;

  v_user_id      := gen_random_uuid();
  v_workspace_id := gen_random_uuid();

  INSERT INTO public.users (
    id, external_user_id, email, full_name, image_url,
    auth_provider, email_verified, plan, created_at, updated_at
  ) VALUES (
    v_user_id, p_external_id, p_email, p_full_name, p_image_url,
    'oauth', true, 'Free', now(), now()
  );

  INSERT INTO public.plan_usage (
    user_id, plan,
    ai_drafts_used, carousels_used, hooks_used, analyses_used,
    cycle_start, cycle_end
  ) VALUES (
    v_user_id::TEXT, 'free',
    0, 0, 0, 0,
    now(), now() + INTERVAL '1 month'
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspaces (
    id, name, owner_id, owner_email, slug, created_at, updated_at
  ) VALUES (
    v_workspace_id,
    'My Workspace',
    v_user_id,
    p_email,
    'workspace-' || left(p_external_id, 8),
    now(), now()
  );

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  RETURN jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
END;
$$;

-- ----------------------------------------------------------------
-- 3. activate_plan: fix param names + null-safe org update
--    payments.ts passes: p_user_id, p_organization_id, p_plan_name,
--                        p_expires_at, p_customer_id
-- ----------------------------------------------------------------
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
