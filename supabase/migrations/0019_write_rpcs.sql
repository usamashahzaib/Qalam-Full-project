CREATE OR REPLACE FUNCTION public.create_post_with_version(
  p_user_id TEXT,
  p_workspace_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_hook TEXT,
  p_cta TEXT,
  p_role_profile TEXT,
  p_topic TEXT,
  p_engagement_score INTEGER,
  p_metadata JSONB,
  p_status TEXT DEFAULT 'draft'
)
RETURNS UUID AS $$
DECLARE
  new_post_id UUID;
BEGIN
  INSERT INTO posts (user_id, workspace_id, title, content, hook, cta, role_profile, topic, engagement_score, status, metadata)
  VALUES (
    p_user_id, p_workspace_id, p_title, p_content, p_hook, p_cta,
    p_role_profile, p_topic, p_engagement_score,
    CASE WHEN p_status IN ('draft','published','scheduled','archived') THEN p_status ELSE 'draft' END,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_post_id;

  INSERT INTO post_versions (post_id, version_number, content, change_summary, engagement_score, created_by)
  VALUES (new_post_id, 1, p_content, 'Initial AI draft', p_engagement_score, p_user_id);

  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.create_carousel_project(
  p_user_id TEXT,
  p_title TEXT,
  p_role TEXT,
  p_slides JSONB,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  project_id UUID;
BEGIN
  INSERT INTO carousel_projects (user_id, workspace_id, title, topic, role_profile)
  VALUES (p_user_id, p_workspace_id, p_title, p_title, p_role)
  RETURNING id INTO project_id;

  INSERT INTO carousel_slides (project_id, slide_number, title, content, image_prompt)
  SELECT
    project_id,
    (s->>'slide_number')::int,
    s->>'title',
    s->>'content',
    COALESCE(s->>'visual', s->>'image_prompt')
  FROM jsonb_array_elements(p_slides) AS s;

  RETURN project_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.create_conversation_with_message(
  p_user_id TEXT,
  p_title TEXT,
  p_role_context TEXT,
  p_message TEXT,
  p_assistant_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  INSERT INTO conversations (user_id, title, role_context)
  VALUES (p_user_id, p_title, p_role_context)
  RETURNING id INTO conversation_id;

  INSERT INTO conversation_messages (conversation_id, role, content)
  VALUES (conversation_id, 'user', p_message);

  IF p_assistant_message IS NOT NULL AND length(trim(p_assistant_message)) > 0 THEN
    INSERT INTO conversation_messages (conversation_id, role, content)
    VALUES (conversation_id, 'assistant', p_assistant_message);
  END IF;

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.append_conversation_turn(
  p_user_id TEXT,
  p_conversation_id UUID,
  p_user_message TEXT,
  p_assistant_message TEXT,
  p_role_context TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'conversation_not_found';
  END IF;

  INSERT INTO conversation_messages (conversation_id, role, content)
  VALUES
    (p_conversation_id, 'user', p_user_message),
    (p_conversation_id, 'assistant', p_assistant_message);

  UPDATE conversations
  SET
    updated_at = now(),
    role_context = p_role_context,
    title = COALESCE(NULLIF(trim(p_title), ''), title)
  WHERE id = p_conversation_id AND user_id = p_user_id;

  RETURN p_conversation_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.create_workspace_with_member(
  p_user_id TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'owner'
)
RETURNS UUID AS $$
DECLARE
  workspace_id UUID;
BEGIN
  INSERT INTO workspaces (name, owner_id)
  VALUES (p_name, p_user_id)
  RETURNING id INTO workspace_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (
    workspace_id,
    p_user_id,
    CASE WHEN p_role IN ('owner','admin','editor','viewer') THEN p_role ELSE 'owner' END
  );

  RETURN workspace_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.save_voice_training_sample(
  p_user_id TEXT,
  p_samples JSONB,
  p_fingerprint JSONB,
  p_sample_text TEXT,
  p_analysis JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO voice_profiles (user_id, sample_posts, voice_fingerprint, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_samples, '[]'::jsonb),
    COALESCE(p_fingerprint, '{}'::jsonb),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    sample_posts = EXCLUDED.sample_posts,
    voice_fingerprint = EXCLUDED.voice_fingerprint,
    updated_at = now();

  INSERT INTO voice_training_logs (user_id, sample_text, ai_analysis)
  VALUES (p_user_id, p_sample_text, COALESCE(p_analysis, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.clear_voice_training_samples(
  p_user_id TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO voice_profiles (user_id, sample_posts, voice_fingerprint, updated_at)
  VALUES (p_user_id, '[]'::jsonb, '{}'::jsonb, now())
  ON CONFLICT (user_id) DO UPDATE
  SET sample_posts = '[]'::jsonb,
      voice_fingerprint = '{}'::jsonb,
      updated_at = now();

  DELETE FROM voice_training_logs WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
