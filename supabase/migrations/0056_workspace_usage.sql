-- ----------------------------------------------------------------
-- Agency Phase 1: per-workspace usage enforcement.
-- plan_usage is keyed by user_id, so an Agency owner's 5 client
-- workspaces all shared one draft counter. This table tracks usage
-- per workspace per calendar month so each client gets its own
-- 60-draft / 10-carousel allowance, matching the "60 posts x 5
-- workspaces" line already sold on the Agency plan.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month            INTEGER     NOT NULL,
  year             INTEGER     NOT NULL,
  ai_drafts_used   INTEGER     NOT NULL DEFAULT 0,
  carousels_used   INTEGER     NOT NULL DEFAULT 0,
  posts_published  INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_lookup ON public.workspace_usage (workspace_id, year, month);

ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_workspace_usage(
  p_workspace_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
  result workspace_usage%ROWTYPE;
BEGIN
  SELECT * INTO result FROM workspace_usage
  WHERE workspace_id = p_workspace_id AND month = p_month AND year = p_year;

  IF result.id IS NULL THEN
    INSERT INTO workspace_usage (workspace_id, month, year)
    VALUES (p_workspace_id, p_month, p_year)
    ON CONFLICT (workspace_id, month, year) DO UPDATE SET updated_at = workspace_usage.updated_at
    RETURNING * INTO result;
  END IF;

  RETURN to_jsonb(result);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_workspace_usage(
  p_workspace_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_field TEXT,
  p_max_allowed INTEGER
)
RETURNS JSONB AS $$
DECLARE
  current_val INTEGER;
  updated_rows INTEGER;
BEGIN
  IF p_field NOT IN ('ai_drafts_used', 'carousels_used', 'posts_published') THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'invalid_field');
  END IF;

  INSERT INTO workspace_usage (workspace_id, month, year)
  VALUES (p_workspace_id, p_month, p_year)
  ON CONFLICT (workspace_id, month, year) DO NOTHING;

  SELECT CASE p_field
    WHEN 'ai_drafts_used' THEN ai_drafts_used
    WHEN 'carousels_used' THEN carousels_used
    WHEN 'posts_published' THEN posts_published
  END INTO current_val
  FROM workspace_usage
  WHERE workspace_id = p_workspace_id AND month = p_month AND year = p_year
  FOR UPDATE;

  IF current_val IS NULL THEN
    current_val := 0;
  END IF;

  IF current_val >= p_max_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'current', current_val, 'limit', p_max_allowed);
  END IF;

  UPDATE workspace_usage
  SET ai_drafts_used = CASE WHEN p_field = 'ai_drafts_used' THEN ai_drafts_used + 1 ELSE ai_drafts_used END,
      carousels_used = CASE WHEN p_field = 'carousels_used' THEN carousels_used + 1 ELSE carousels_used END,
      posts_published = CASE WHEN p_field = 'posts_published' THEN posts_published + 1 ELSE posts_published END,
      updated_at = now()
  WHERE workspace_id = p_workspace_id AND month = p_month AND year = p_year;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'update_failed');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'current', current_val + 1, 'limit', p_max_allowed);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.decrement_workspace_usage(
  p_workspace_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_field TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_field NOT IN ('ai_drafts_used', 'carousels_used', 'posts_published') THEN
    RETURN;
  END IF;

  UPDATE workspace_usage
  SET ai_drafts_used = CASE WHEN p_field = 'ai_drafts_used' AND ai_drafts_used > 0 THEN ai_drafts_used - 1 ELSE ai_drafts_used END,
      carousels_used = CASE WHEN p_field = 'carousels_used' AND carousels_used > 0 THEN carousels_used - 1 ELSE carousels_used END,
      posts_published = CASE WHEN p_field = 'posts_published' AND posts_published > 0 THEN posts_published - 1 ELSE posts_published END,
      updated_at = now()
  WHERE workspace_id = p_workspace_id AND month = p_month AND year = p_year;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.get_or_create_workspace_usage(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_workspace_usage(UUID, INTEGER, INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_workspace_usage(UUID, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
