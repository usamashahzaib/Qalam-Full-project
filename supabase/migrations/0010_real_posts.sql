-- Real posts table with versions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS post_versions CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- External user ID
  workspace_id UUID,
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  hook TEXT,
  cta TEXT,
  role_profile TEXT, -- 'ai_engineer', 'ceo', 'hr', 'sales', 'designer', etc.
  topic TEXT,
  engagement_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  linkedin_post_id TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own posts
CREATE POLICY "Users can CRUD own posts" ON posts
  FOR ALL USING (user_id = auth.uid()::text);

-- Index for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_workspace ON posts(workspace_id);

-- Real post versions (compounding asset)
CREATE TABLE post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_summary TEXT, -- AI-generated summary of what changed
  engagement_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL
);

ALTER TABLE post_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own versions" ON post_versions
  FOR ALL USING (
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()::text)
  );

CREATE INDEX idx_versions_post ON post_versions(post_id);
