-- Rewire voice profiles to the workspace row used by generation/scoring.

ALTER TABLE public.voice_profiles
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_tone TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS example_posts TEXT,
  ADD COLUMN IF NOT EXISTS characteristics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS voice_fingerprint JSONB DEFAULT '{}';

UPDATE public.voice_profiles vp
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE vp.workspace_id IS NULL
  AND wm.user_id = vp.user_id;

CREATE INDEX IF NOT EXISTS idx_voice_profiles_workspace_id
  ON public.voice_profiles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id
  ON public.voice_profiles(user_id);

CREATE OR REPLACE FUNCTION public.save_voice_training_sample(
  p_user_id TEXT,
  p_samples JSONB,
  p_fingerprint JSONB,
  p_sample_text TEXT,
  p_analysis JSONB,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  target_id UUID;
  target_workspace_id UUID;
BEGIN
  target_workspace_id := p_workspace_id;

  IF target_workspace_id IS NULL THEN
    SELECT workspace_id INTO target_workspace_id
    FROM public.workspace_members
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  SELECT id INTO target_id
  FROM public.voice_profiles
  WHERE (target_workspace_id IS NOT NULL AND workspace_id = target_workspace_id)
     OR user_id = p_user_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF target_id IS NULL THEN
    INSERT INTO public.voice_profiles (
      user_id, workspace_id, sample_posts, voice_fingerprint, characteristics, updated_at
    )
    VALUES (
      p_user_id,
      target_workspace_id,
      COALESCE(p_samples, '[]'::jsonb),
      COALESCE(p_fingerprint, '{}'::jsonb),
      COALESCE(p_analysis, '{}'::jsonb),
      now()
    );
  ELSE
    UPDATE public.voice_profiles
    SET workspace_id = COALESCE(target_workspace_id, workspace_id),
        sample_posts = COALESCE(p_samples, '[]'::jsonb),
        voice_fingerprint = COALESCE(p_fingerprint, '{}'::jsonb),
        characteristics = COALESCE(p_analysis, '{}'::jsonb),
        updated_at = now()
    WHERE id = target_id;
  END IF;

  INSERT INTO public.voice_training_logs (user_id, sample_text, ai_analysis)
  VALUES (p_user_id, p_sample_text, COALESCE(p_analysis, '{}'::jsonb));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.clear_voice_training_samples(
  p_user_id TEXT,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  target_id UUID;
  target_workspace_id UUID;
BEGIN
  target_workspace_id := p_workspace_id;

  IF target_workspace_id IS NULL THEN
    SELECT workspace_id INTO target_workspace_id
    FROM public.workspace_members
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  SELECT id INTO target_id
  FROM public.voice_profiles
  WHERE (target_workspace_id IS NOT NULL AND workspace_id = target_workspace_id)
     OR user_id = p_user_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF target_id IS NULL THEN
    INSERT INTO public.voice_profiles (
      user_id, workspace_id, sample_posts, voice_fingerprint, characteristics, updated_at
    )
    VALUES (p_user_id, target_workspace_id, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, now());
  ELSE
    UPDATE public.voice_profiles
    SET workspace_id = COALESCE(target_workspace_id, workspace_id),
        sample_posts = '[]'::jsonb,
        voice_fingerprint = '{}'::jsonb,
        characteristics = '{}'::jsonb,
        updated_at = now()
    WHERE id = target_id;
  END IF;

  DELETE FROM public.voice_training_logs WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
