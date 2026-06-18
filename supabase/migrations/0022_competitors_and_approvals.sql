-- competitor_analyses: stores per-user analysis history
CREATE TABLE IF NOT EXISTS competitor_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_text TEXT NOT NULL,
  post_url TEXT,
  hook_structure JSONB,
  engagement_factors JSONB,
  content_pattern JSONB,
  improvements JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS competitor_analyses_user_id_idx ON competitor_analyses (user_id, created_at DESC);

-- Track competitor research runs per billing cycle
ALTER TABLE plan_usage ADD COLUMN IF NOT EXISTS competitor_runs_used INT DEFAULT 0;

-- approvals: approval workflow requests
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID,
  requester_id TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  post_title TEXT,
  post_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approvals_requester_id_idx ON approvals (requester_id, created_at DESC);

ALTER TABLE competitor_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Users see only their own competitor analyses
CREATE POLICY "competitor_analyses_own" ON competitor_analyses
  FOR ALL USING (user_id = auth.uid()::text);

-- Users see only their own approval requests
CREATE POLICY "approvals_requester_own" ON approvals
  FOR ALL USING (requester_id = auth.uid()::text);
