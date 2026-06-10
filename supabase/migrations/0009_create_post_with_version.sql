ALTER TABLE public.posts
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS author_id UUID,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS post_type TEXT,
  ADD COLUMN IF NOT EXISTS quality_score INTEGER,
  ADD COLUMN IF NOT EXISTS published_at TEXT,
  ADD COLUMN IF NOT EXISTS external_post_urn TEXT;

CREATE TABLE IF NOT EXISTS public.post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_versions_post_id
  ON public.post_versions(post_id);

ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION create_post_with_version(
  p_post_data JSONB,
  p_version_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO posts (
    workspace_id,
    user_id,
    author_id,
    title,
    content,
    topic,
    role,
    format,
    type,
    post_type,
    status,
    quality_score
  )
  VALUES (
    NULLIF(p_post_data->>'workspace_id', '')::UUID,
    NULLIF(p_post_data->>'user_id', '')::UUID,
    NULLIF(COALESCE(p_post_data->>'author_id', p_post_data->>'user_id'), '')::UUID,
    COALESCE(NULLIF(p_post_data->>'title', ''), LEFT(COALESCE(p_post_data->>'content', 'Untitled post'), 80)),
    p_post_data->>'content',
    p_post_data->>'topic',
    p_post_data->>'role',
    p_post_data->>'format',
    COALESCE(p_post_data->>'type', p_post_data->>'format'),
    COALESCE(p_post_data->>'post_type', p_post_data->>'type', p_post_data->>'format', 'LinkedIn - Text post'),
    COALESCE(p_post_data->>'status', 'draft'),
    NULLIF(p_post_data->>'quality_score', '')::INTEGER
  )
  RETURNING id INTO v_post_id;

  INSERT INTO post_versions (post_id, content, version_number, created_by)
  VALUES (
    v_post_id,
    COALESCE(p_version_data->>'content', p_post_data->>'content', ''),
    COALESCE(NULLIF(p_version_data->>'version_number', '')::INTEGER, 1),
    NULLIF(p_version_data->>'created_by', '')::UUID
  );

  RETURN jsonb_build_object('post_id', v_post_id);
END;
$$;
