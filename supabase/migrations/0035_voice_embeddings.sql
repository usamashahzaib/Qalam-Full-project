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
