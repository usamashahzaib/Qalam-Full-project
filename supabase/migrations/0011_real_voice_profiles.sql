-- Real voice training (few-shot based, not 5 string labels)
DROP TABLE IF EXISTS voice_training_logs CASCADE;
DROP TABLE IF EXISTS voice_profiles CASCADE;

CREATE TABLE voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  workspace_id UUID,
  role TEXT NOT NULL DEFAULT 'general', -- ai_engineer, ceo, hr, sales, designer, founder, consultant
  display_name TEXT,
  -- Few-shot examples (last 20, not unbounded)
  sample_posts JSONB NOT NULL DEFAULT '[]',
  -- Derived voice fingerprint (updated when samples change)
  voice_fingerprint JSONB DEFAULT '{}',
  -- Explicit rules the user sets
  explicit_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own voice" ON voice_profiles
  FOR ALL USING (user_id = auth.uid()::text);

CREATE INDEX idx_voice_user ON voice_profiles(user_id);

-- Voice training history (audit trail)
CREATE TABLE voice_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  sample_text TEXT NOT NULL,
  ai_analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voice_training_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own logs" ON voice_training_logs
  FOR SELECT USING (user_id = auth.uid()::text);
