-- Restore service-only tables used by active server routes but absent remotely.
-- This migration intentionally excludes the legacy 0053 delete_user_data()
-- definition because 20260724113335 contains the current hardened version.

CREATE TABLE IF NOT EXISTS public.publishing_accounts (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider                 TEXT        NOT NULL DEFAULT 'linkedin',
  provider_account_id      TEXT        NOT NULL,
  access_token             TEXT,
  refresh_token            TEXT,
  expires_at               TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT publishing_accounts_workspace_provider_key UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_publishing_accounts_workspace
  ON public.publishing_accounts (workspace_id);

CREATE TABLE IF NOT EXISTS public.publish_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  account_id        UUID        REFERENCES public.publishing_accounts(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL CHECK (status IN ('success', 'failed')),
  error_message     TEXT,
  provider_response JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_logs_post
  ON public.publish_logs (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'completed'
               CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload      JSONB,
  result       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace
  ON public.jobs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  post_id      UUID        REFERENCES public.posts(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,
  metrics      JSONB,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace
  ON public.analytics_events (workspace_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL
               CHECK (role IN ('admin', 'editor', 'viewer', 'client_reviewer')),
  invited_by   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_invites_workspace_email_key UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email
  ON public.workspace_invites (email);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON public.contact_submissions (created_at DESC);

ALTER TABLE public.linkedin_credentials
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at BIGINT;

ALTER TABLE public.publishing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.publishing_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.publish_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.workspace_invites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.contact_submissions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.publishing_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.publish_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_invites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.decrement_plan_usage(
  p_user_id TEXT,
  p_field TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  IF p_field NOT IN (
    'ai_drafts_used',
    'carousels_used',
    'hooks_used',
    'analyses_used'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_field');
  END IF;

  SELECT CASE p_field
    WHEN 'ai_drafts_used' THEN ai_drafts_used
    WHEN 'carousels_used' THEN carousels_used
    WHEN 'hooks_used' THEN hooks_used
    WHEN 'analyses_used' THEN analyses_used
  END
  INTO v_current
  FROM public.plan_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current IS NULL OR v_current <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'current', 0);
  END IF;

  UPDATE public.plan_usage
  SET ai_drafts_used = CASE
        WHEN p_field = 'ai_drafts_used' THEN GREATEST(ai_drafts_used - 1, 0)
        ELSE ai_drafts_used
      END,
      carousels_used = CASE
        WHEN p_field = 'carousels_used' THEN GREATEST(carousels_used - 1, 0)
        ELSE carousels_used
      END,
      hooks_used = CASE
        WHEN p_field = 'hooks_used' THEN GREATEST(hooks_used - 1, 0)
        ELSE hooks_used
      END,
      analyses_used = CASE
        WHEN p_field = 'analyses_used' THEN GREATEST(analyses_used - 1, 0)
        ELSE analyses_used
      END,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'current', GREATEST(v_current - 1, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_plan_usage(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_plan_usage(TEXT, TEXT)
  TO service_role;
