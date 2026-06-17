-- ============================================================
-- COMBINED_NEW_MIGRATIONS.sql
-- Migrations 0031-0036 combined for Supabase SQL Editor paste.
--
-- HOW TO USE:
--   1. Go to https://app.supabase.com → Your Project → SQL Editor
--   2. Paste this entire file and click Run
--   3. If pgvector is not enabled, the voice embedding columns are
--      silently skipped. Enable it in:
--      Dashboard → Database → Extensions → vector → Enable
--      Then run:
--        ALTER TABLE public.voice_profiles ADD COLUMN IF NOT EXISTS embedding vector(768);
--        ALTER TABLE public.voice_examples  ADD COLUMN IF NOT EXISTS embedding vector(768);
-- ============================================================


-- ============================================================
-- 0031: Atomic user provisioning RPC + payment pipeline fixes
-- ============================================================

-- Fix organizations plan CHECK constraint to include 'Agency'
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('Free', 'Solo', 'Pro', 'Agency', 'Agency Starter', 'Agency Growth'));

-- provision_oauth_user: atomic 4-table insert, idempotent
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

-- activate_plan: fix param names + null-safe org update
-- PostgreSQL 42P13: cannot rename parameters via CREATE OR REPLACE.
-- Drop old signature (had p_org_id) before recreating with p_organization_id.
DROP FUNCTION IF EXISTS public.activate_plan(uuid, uuid, text, timestamp with time zone, text);
DROP FUNCTION IF EXISTS public.activate_plan(uuid, uuid, text, timestamptz, text);

CREATE OR REPLACE FUNCTION public.activate_plan(
  p_user_id        UUID,
  p_organization_id UUID,
  p_plan_name      TEXT,
  p_expires_at     TIMESTAMPTZ,
  p_customer_id    TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.users
  SET    plan           = p_plan_name,
         plan_expires_at = p_expires_at,
         updated_at     = now()
  WHERE  id = p_user_id;

  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organizations
    SET    plan                = p_plan_name,
           subscription_status = 'active',
           plan_expires_at     = p_expires_at,
           customer_id         = p_customer_id,
           updated_at          = now()
    WHERE  id = p_organization_id;
  END IF;

  INSERT INTO public.plan_usage (user_id, plan, updated_at)
  VALUES (p_user_id::TEXT, lower(p_plan_name), now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan = lower(excluded.plan), updated_at = now();
END;
$$;


-- ============================================================
-- 0032: AI usage cost tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  provider         TEXT        NOT NULL CHECK (provider IN ('groq', 'gemini')),
  model            TEXT        NOT NULL,
  tokens_in        INTEGER     NOT NULL DEFAULT 0,
  tokens_out       INTEGER     NOT NULL DEFAULT 0,
  estimated_cost_usd FLOAT    NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id    ON public.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage (created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_only" ON public.ai_usage
    USING (false) WITH CHECK (false);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.get_monthly_ai_cost(p_user_id UUID)
RETURNS FLOAT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM   public.ai_usage
  WHERE  user_id = p_user_id
    AND  created_at >= date_trunc('month', now());
$$;


-- ============================================================
-- 0033: Post version history
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content             TEXT        NOT NULL DEFAULT '',
  version_number      INTEGER     NOT NULL,
  edit_delta_percent  FLOAT,
  created_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post_id    ON public.post_versions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_created_at ON public.post_versions (post_id, created_at DESC);

ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "workspace_member_read" ON public.post_versions
    FOR SELECT
    USING (
      post_id IN (
        SELECT p.id FROM public.posts p
        JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.next_post_version(p_post_id UUID)
RETURNS INTEGER LANGUAGE sql AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM   public.post_versions
  WHERE  post_id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION public.update_post_with_version(
  p_post_id        UUID,
  p_workspace_id   UUID,
  p_new_content    TEXT,
  p_created_by     UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_old_content    TEXT;
  v_version        INTEGER;
  v_old_len        INTEGER;
  v_new_len        INTEGER;
  v_delta          FLOAT;
BEGIN
  SELECT content INTO v_old_content
  FROM   public.posts
  WHERE  id = p_post_id AND workspace_id = p_workspace_id;

  IF v_old_content IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF v_old_content IS DISTINCT FROM p_new_content THEN
    v_version := public.next_post_version(p_post_id);

    v_old_len := length(v_old_content);
    v_new_len := length(p_new_content);
    IF v_old_len > 0 THEN
      v_delta := abs(v_new_len - v_old_len)::FLOAT / GREATEST(v_old_len, v_new_len) * 100;
    ELSE
      v_delta := 100;
    END IF;

    INSERT INTO public.post_versions (post_id, content, version_number, edit_delta_percent, created_by)
    VALUES (p_post_id, v_old_content, v_version, v_delta, p_created_by);
  END IF;

  UPDATE public.posts
  SET    content    = p_new_content,
         updated_at = now()
  WHERE  id = p_post_id AND workspace_id = p_workspace_id;
END;
$$;


-- ============================================================
-- 0034: Scheduling notifications + manual analytics snapshots
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduling_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  email      TEXT,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sched_notif_post_id ON public.scheduling_notifications (post_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_user_id ON public.scheduling_notifications (user_id);

ALTER TABLE public.scheduling_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_only" ON public.scheduling_notifications
    USING (false) WITH CHECK (false);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID        REFERENCES public.posts(id) ON DELETE SET NULL,
  workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  impressions     INTEGER     NOT NULL DEFAULT 0,
  reactions       INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  reposts         INTEGER     NOT NULL DEFAULT 0,
  follower_delta  INTEGER     NOT NULL DEFAULT 0,
  notes           TEXT,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_workspace ON public.analytics_snapshots (workspace_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_post_id   ON public.analytics_snapshots (post_id);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "workspace_member_read" ON public.analytics_snapshots
    FOR SELECT
    USING (
      workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'posts' AND constraint_name = 'posts_status_check'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_status_check
      CHECK (status IN ('draft','pending_approval','approved','rejected','scheduled','notified','published','failed','archived'));
  END IF;
END $$;


-- ============================================================
-- 0035: Voice profile embeddings (pgvector - graceful skip)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    ALTER TABLE public.voice_profiles
      ADD COLUMN IF NOT EXISTS embedding vector(768);
    RAISE NOTICE 'pgvector: voice_profiles.embedding column created';
  ELSE
    RAISE NOTICE 'pgvector not enabled - skipping voice_profiles.embedding. Enable in Supabase Dashboard: Database > Extensions > vector';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.voice_examples (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(content) >= 10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE public.voice_examples
      ADD COLUMN IF NOT EXISTS embedding vector(768);
    RAISE NOTICE 'pgvector: voice_examples.embedding column created';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_voice_examples_workspace
  ON public.voice_examples (workspace_id);

ALTER TABLE public.voice_examples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "voice_examples_service_all"
    ON public.voice_examples
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 0036: Schema cleanup
-- ============================================================

DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.user_workspace CASCADE;

ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.plan_usage pu
SET    user_uuid = u.id
FROM   public.users u
WHERE  pu.user_uuid IS NULL
  AND  pu.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND  u.id::TEXT = pu.user_id;

CREATE INDEX IF NOT EXISTS idx_plan_usage_user_uuid ON public.plan_usage (user_uuid);

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'client_reviewer'));

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON public.workspace_members (workspace_id);


-- ============================================================
-- RPCs needed by plan-limits-v2.ts and usage tracking
-- ============================================================

-- check_plan_limit: returns true if the user is under their plan limit
CREATE OR REPLACE FUNCTION public.check_plan_limit(
  p_user_id    TEXT,
  p_action     TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_plan          TEXT;
  v_used          INTEGER;
  v_limit         INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM public.plan_usage WHERE user_id = p_user_id LIMIT 1;
  IF v_plan IS NULL THEN RETURN true; END IF;

  CASE p_action
    WHEN 'ai_drafts' THEN
      SELECT ai_drafts_used INTO v_used FROM public.plan_usage WHERE user_id = p_user_id;
      v_limit := CASE v_plan
        WHEN 'free'  THEN 10
        WHEN 'solo'  THEN 50
        WHEN 'pro'   THEN 200
        ELSE 999999
      END;
    WHEN 'carousels' THEN
      SELECT carousels_used INTO v_used FROM public.plan_usage WHERE user_id = p_user_id;
      v_limit := CASE v_plan
        WHEN 'free'  THEN 0
        WHEN 'solo'  THEN 0
        WHEN 'pro'   THEN 20
        ELSE 999999
      END;
    WHEN 'hooks' THEN
      SELECT hooks_used INTO v_used FROM public.plan_usage WHERE user_id = p_user_id;
      v_limit := CASE v_plan
        WHEN 'free'  THEN 3
        WHEN 'solo'  THEN 20
        WHEN 'pro'   THEN 100
        ELSE 999999
      END;
    WHEN 'analyses' THEN
      SELECT analyses_used INTO v_used FROM public.plan_usage WHERE user_id = p_user_id;
      v_limit := CASE v_plan
        WHEN 'free'  THEN 0
        WHEN 'solo'  THEN 5
        WHEN 'pro'   THEN 20
        ELSE 999999
      END;
    ELSE
      RETURN true;
  END CASE;

  RETURN COALESCE(v_used, 0) < v_limit;
END;
$$;

-- increment_usage: atomically increment a usage counter
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id  TEXT,
  p_action   TEXT
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  CASE p_action
    WHEN 'ai_drafts' THEN
      UPDATE public.plan_usage SET ai_drafts_used = COALESCE(ai_drafts_used, 0) + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'carousels' THEN
      UPDATE public.plan_usage SET carousels_used = COALESCE(carousels_used, 0) + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'hooks' THEN
      UPDATE public.plan_usage SET hooks_used = COALESCE(hooks_used, 0) + 1, updated_at = now() WHERE user_id = p_user_id;
    WHEN 'analyses' THEN
      UPDATE public.plan_usage SET analyses_used = COALESCE(analyses_used, 0) + 1, updated_at = now() WHERE user_id = p_user_id;
    ELSE NULL;
  END CASE;
END;
$$;

-- get_plan_status: return plan + all usage counters for a user
CREATE OR REPLACE FUNCTION public.get_plan_status(
  p_user_id TEXT
) RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'plan',           COALESCE(pu.plan, 'free'),
    'ai_drafts_used', COALESCE(pu.ai_drafts_used, 0),
    'carousels_used', COALESCE(pu.carousels_used, 0),
    'hooks_used',     COALESCE(pu.hooks_used, 0),
    'analyses_used',  COALESCE(pu.analyses_used, 0),
    'cycle_start',    pu.cycle_start,
    'cycle_end',      pu.cycle_end
  )
  FROM public.plan_usage pu
  WHERE pu.user_id = p_user_id
  LIMIT 1;
$$;
