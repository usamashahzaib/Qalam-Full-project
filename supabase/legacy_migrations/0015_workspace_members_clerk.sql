ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS owner_id TEXT;

ALTER TABLE workspaces
  ALTER COLUMN organization_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own workspace memberships" ON workspace_members;
CREATE POLICY "Users can read own workspace memberships" ON workspace_members
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage own workspace memberships" ON workspace_members;
CREATE POLICY "Users can manage own workspace memberships" ON workspace_members
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
