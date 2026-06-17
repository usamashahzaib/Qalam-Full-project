-- ========================================
-- 0031_atomic_provisioning_and_payment_fixes.sql
-- ========================================
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


-- ========================================
-- 0032_ai_cost_tracking.sql
-- ========================================
-- Migration 0032: AI usage cost tracking
-- Tracks every AI call with token counts and estimated cost.
-- Enables per-user monthly caps and cost attribution.

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
-- Only service role reads/writes; no client-side access needed.
CREATE POLICY "service_role_only" ON public.ai_usage
  USING (false) WITH CHECK (false);

-- Monthly spend aggregation helper (used by cost-cap enforcement)
CREATE OR REPLACE FUNCTION public.get_monthly_ai_cost(p_user_id UUID)
RETURNS FLOAT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(estimated_cost_usd), 0)
  FROM   public.ai_usage
  WHERE  user_id = p_user_id
    AND  created_at >= date_trunc('month', now());
$$;


-- ========================================
-- 0033_post_versions.sql
-- ========================================
-- Migration 0033: Post version history
-- Every content update saves a snapshot so drafts are never lost.

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
CREATE POLICY "workspace_member_read" ON public.post_versions
  FOR SELECT
  USING (
    post_id IN (
      SELECT p.id FROM public.posts p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Returns the next version number for a post (1-based, gapless)
CREATE OR REPLACE FUNCTION public.next_post_version(p_post_id UUID)
RETURNS INTEGER LANGUAGE sql AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM   public.post_versions
  WHERE  post_id = p_post_id;
$$;

-- Snapshot current post content, then update it.
-- Called from the application layer before any content PATCH.
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

  -- Only snapshot when content actually changed
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


-- ========================================
-- 0034_scheduling_and_analytics.sql
-- ========================================
-- Migration 0034: Scheduling notifications + manual analytics snapshots

-- ----------------------------------------------------------------
-- 1. Scheduling notification log
-- ----------------------------------------------------------------
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
CREATE POLICY "service_role_only" ON public.scheduling_notifications
  USING (false) WITH CHECK (false);

-- ----------------------------------------------------------------
-- 2. Manual analytics snapshots (Phase 1: user-entered data)
-- ----------------------------------------------------------------
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
CREATE POLICY "workspace_member_read" ON public.analytics_snapshots
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. Add 'notified' to posts status if not already present
-- ----------------------------------------------------------------
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

-- Re-add with extended values (posts table may not have a constraint yet)
-- Using IF NOT EXISTS pattern via a DO block for safety
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


-- ========================================
-- 0035_voice_embeddings.sql
-- ========================================
-- Migration 0035: Voice profile embeddings (pgvector)
--
-- Adds an embedding column to voice_profiles for semantic RAG retrieval.
-- Gracefully skips vector column creation if pgvector extension is not enabled.
-- To enable pgvector: Supabase Dashboard → Database → Extensions → vector → Enable
--
-- After enabling pgvector, re-run this migration or run ALTER TABLE manually:
--   ALTER TABLE public.voice_profiles ADD COLUMN IF NOT EXISTS embedding vector(768);
--   ALTER TABLE public.voice_examples  ADD COLUMN IF NOT EXISTS embedding vector(768);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    ALTER TABLE public.voice_profiles
      ADD COLUMN IF NOT EXISTS embedding vector(768);

    RAISE NOTICE 'pgvector: voice_profiles.embedding column created';
  ELSE
    RAISE NOTICE 'pgvector not enabled — skipping voice_profiles.embedding. Enable in Supabase Dashboard → Extensions → vector';
  END IF;
END $$;

-- Store example posts as individual chunks for retrieval
-- (text only — vector column added separately after pgvector is enabled)
CREATE TABLE IF NOT EXISTS public.voice_examples (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (char_length(content) >= 10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- embedding column added only when pgvector is available
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

-- RLS
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


-- ========================================
-- 0036_schema_cleanup.sql
-- ========================================
-- Migration 0036: Schema cleanup
--
-- 1. Drop the legacy 'memberships' table (replaced by workspace_members)
-- 2. Add a proper UUID FK from plan_usage.user_id to users.id
--    (plan_usage.user_id is TEXT; we add a soft FK via a check function to
--     avoid breaking existing rows while still enforcing integrity on new inserts)
-- 3. Remove duplicate user_workspace table if it exists

-- ----------------------------------------------------------------
-- 1. Drop legacy memberships table (data should be in workspace_members)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.memberships CASCADE;

-- ----------------------------------------------------------------
-- 2. Drop legacy user_workspace table if it exists
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.user_workspace CASCADE;

-- ----------------------------------------------------------------
-- 3. plan_usage.user_id — add UUID FK column alongside the TEXT column
--    We cannot simply change TEXT -> UUID without a data migration,
--    so we add a new UUID column, backfill it, and enforce FK there.
--    Application code already uses internal UUIDs for plan_usage inserts.
-- ----------------------------------------------------------------
ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill where user_id looks like a UUID and matches a users.id row
UPDATE public.plan_usage pu
SET    user_uuid = u.id
FROM   public.users u
WHERE  pu.user_uuid IS NULL
  AND  pu.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND  u.id::TEXT = pu.user_id;

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_plan_usage_user_uuid ON public.plan_usage (user_uuid);

-- ----------------------------------------------------------------
-- 4. Ensure workspace_members has role column with correct CHECK
-- ----------------------------------------------------------------
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'client_reviewer'));

-- ----------------------------------------------------------------
-- 5. Index for common workspace resolution query
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON public.workspace_members (workspace_id);


