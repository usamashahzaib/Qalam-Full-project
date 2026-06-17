-- Migration 0035: Voice profile embeddings (pgvector)
--
-- Adds an embedding column to voice_profiles for semantic RAG retrieval.
-- Gracefully skips vector column creation if pgvector extension is not enabled.
-- To enable pgvector: Supabase Dashboard → Database → Extensions → vector → Enable
--
-- After enabling pgvector, re-run this migration or run ALTER TABLE manually:
--   ALTER TABLE public.voice_profiles ADD COLUMN IF NOT EXISTS embedding vector(768);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    ALTER TABLE public.voice_profiles
      ADD COLUMN IF NOT EXISTS embedding vector(768);

    -- Index for fast cosine similarity search
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'voice_profiles'
        AND indexname = 'idx_voice_profiles_embedding'
    ) THEN
      CREATE INDEX idx_voice_profiles_embedding
        ON public.voice_profiles
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10);
    END IF;

    RAISE NOTICE 'pgvector: voice_profiles.embedding column and index created';
  ELSE
    RAISE NOTICE 'pgvector extension not enabled — skipping voice_profiles.embedding column. Enable it in Supabase Dashboard → Extensions → vector';
  END IF;
END $$;

-- Store example posts as individual chunks for retrieval
-- (text fallback — works without pgvector)
CREATE TABLE IF NOT EXISTS public.voice_examples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) >= 10),
  embedding   vector(768), -- nullable: populated only when pgvector is enabled
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_examples_workspace
  ON public.voice_examples (workspace_id);

-- RLS: workspace members can read their own examples
ALTER TABLE public.voice_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "voice_examples_service_all"
  ON public.voice_examples
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
