-- Carousels table for the carousel studio feature
-- The API route /api/carousel uses this table directly

CREATE TABLE IF NOT EXISTS carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Founder',
  tone TEXT,
  slide_count INTEGER NOT NULL DEFAULT 7,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE carousels ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; user-facing reads are gated by user_id
CREATE POLICY "Service role full access" ON carousels
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_carousels_user_id ON carousels(user_id);
CREATE INDEX IF NOT EXISTS idx_carousels_created_at ON carousels(created_at DESC);
