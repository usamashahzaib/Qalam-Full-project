-- ----------------------------------------------------------------
-- Fixes six schema/migration-chain gaps found in a full-stack audit
-- (July 2026): tables the application code reads/writes that were
-- never created by any migration, plus one RPC that referenced a
-- table which never existed.
-- ----------------------------------------------------------------

-- 1. publish_logs - durable audit trail for LinkedIn publish attempts.
--    lib/server/linkedin-publish.ts inserts into this on every publish
--    outcome and reads it back in reconcileStuckPublishing() to decide
--    whether a post stuck in "publishing" actually succeeded on LinkedIn
--    before reverting it to "scheduled" for retry. Without this table the
--    select always failed silently, so every stuck post was assumed to
--    have failed and could be republished, risking LinkedIn duplicates.
CREATE TABLE IF NOT EXISTS public.publish_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  account_id        UUID,
  status            TEXT        NOT NULL CHECK (status IN ('success', 'failed')),
  error_message     TEXT,
  provider_response JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_logs_post ON public.publish_logs (post_id, created_at DESC);

ALTER TABLE public.publish_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "publish_logs_service_all"
    ON public.publish_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. workspace_invites - pending invites for people who don't have a Qalam
--    account yet. app/api/workspaces/[id]/invite writes these; auth/signup
--    redeems and deletes them on account creation. Neither side ever had a
--    table to operate on, so team/agency invites for non-members silently
--    did nothing.
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'client_reviewer')),
  invited_by   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites (email);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "workspace_invites_service_all"
    ON public.workspace_invites
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. jobs - generic async job log used by app/api/jobs and lib/hooks/usePosts
--    (loadJobs/createJob/deleteJob). Existed only in the superseded
--    supabase/schema.sql, which schema_final.sql explicitly drops without
--    recreating - the route 500s in any environment built from the tracked
--    migration chain.
CREATE TABLE IF NOT EXISTS public.jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload      JSONB,
  result       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace ON public.jobs (workspace_id, created_at DESC);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "jobs_service_all"
    ON public.jobs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. analytics_events - generic workspace event log used by app/api/events
--    and lib/hooks/usePosts (loadEvents). Same situation as jobs above:
--    only in the superseded schema.sql, dropped (not recreated) in
--    schema_final.sql, absent from the tracked migration chain.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id      UUID        REFERENCES public.posts(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,
  metrics      JSONB,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace ON public.analytics_events (workspace_id, recorded_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "analytics_events_service_all"
    ON public.analytics_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. decrement_plan_usage - refund path for incrementUsage's counterpart.
--    lib/server/plan-limits-v2.ts decrementUsage() calls this RPC first and
--    only falls back to a slower CAS retry loop if it's missing - which it
--    always was, so every refund silently took the slow path. Mirrors
--    increment_plan_usage from 0014_plan_limits_atomic.sql, floored at 0.
CREATE OR REPLACE FUNCTION public.decrement_plan_usage(
  p_user_id TEXT,
  p_field TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_val INTEGER;
BEGIN
  IF p_field NOT IN ('ai_drafts_used', 'carousels_used', 'hooks_used', 'analyses_used') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_field');
  END IF;

  SELECT CASE p_field
    WHEN 'ai_drafts_used' THEN ai_drafts_used
    WHEN 'carousels_used' THEN carousels_used
    WHEN 'hooks_used' THEN hooks_used
    WHEN 'analyses_used' THEN analyses_used
  END INTO current_val
  FROM plan_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_val IS NULL OR current_val <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'current', 0);
  END IF;

  UPDATE plan_usage
  SET ai_drafts_used = CASE WHEN p_field = 'ai_drafts_used' THEN GREATEST(ai_drafts_used - 1, 0) ELSE ai_drafts_used END,
      carousels_used = CASE WHEN p_field = 'carousels_used' THEN GREATEST(carousels_used - 1, 0) ELSE carousels_used END,
      hooks_used = CASE WHEN p_field = 'hooks_used' THEN GREATEST(hooks_used - 1, 0) ELSE hooks_used END,
      analyses_used = CASE WHEN p_field = 'analyses_used' THEN GREATEST(analyses_used - 1, 0) ELSE analyses_used END,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'current', GREATEST(current_val - 1, 0));
END;
$$ LANGUAGE plpgsql;

-- 6. delete_user_data() referenced a "voice_embeddings" table that was
--    never created - only voice_profiles.embedding and
--    voice_examples.embedding *columns* exist (migration 0035). Both GDPR
--    delete routes (self-service and admin) call this RPC and surface its
--    error, so account deletion has been failing outright. Fix the target
--    to voice_examples (per-example RAG chunks, keyed by user_id) - the
--    only piece of voice data 0039/0045 didn't already cover via the
--    voice_profiles delete above it.
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(workspace_id) INTO v_workspace_ids
  FROM workspace_members
  WHERE user_id = target_user_id::TEXT;

  DELETE FROM ai_usage        WHERE user_id = target_user_id::TEXT;
  DELETE FROM scheduling_notifications WHERE user_id = target_user_id::TEXT;
  DELETE FROM approvals       WHERE post_id IN (
    SELECT id FROM posts WHERE user_id = target_user_id::TEXT
  );
  DELETE FROM post_versions   WHERE post_id IN (
    SELECT id FROM posts WHERE user_id = target_user_id::TEXT
  );
  DELETE FROM analytics_snapshots WHERE user_id = target_user_id::TEXT;
  DELETE FROM posts           WHERE user_id = target_user_id::TEXT;
  DELETE FROM carousels       WHERE user_id = target_user_id::TEXT;
  DELETE FROM voice_profiles  WHERE user_id = target_user_id::TEXT;
  DELETE FROM voice_examples  WHERE user_id = target_user_id::TEXT;
  DELETE FROM competitor_analyses WHERE user_id = target_user_id::TEXT;
  DELETE FROM conversations   WHERE user_id = target_user_id::TEXT;
  DELETE FROM linkedin_credentials WHERE user_id = target_user_id::TEXT;
  DELETE FROM publishing_accounts WHERE workspace_id = ANY(v_workspace_ids);
  DELETE FROM referrals       WHERE referrer_user_id = target_user_id;
  DELETE FROM plan_usage      WHERE user_id = target_user_id::TEXT
                                  OR user_uuid = target_user_id;
  DELETE FROM user_overrides  WHERE user_id = target_user_id::TEXT;
  DELETE FROM workspace_members WHERE user_id = target_user_id::TEXT;
  DELETE FROM workspaces
  WHERE owner_id = target_user_id
    AND id NOT IN (SELECT workspace_id FROM workspace_members);
  DELETE FROM users           WHERE id = target_user_id;
END;
$$;
