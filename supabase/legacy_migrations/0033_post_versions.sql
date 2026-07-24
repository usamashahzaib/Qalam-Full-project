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
