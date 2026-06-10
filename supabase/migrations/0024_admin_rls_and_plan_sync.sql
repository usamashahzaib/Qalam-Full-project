-- Allow service role to read user_overrides (needed for plan-limits-v2 override check)
CREATE POLICY IF NOT EXISTS "Service role can read user_overrides"
  ON user_overrides FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Service role can insert user_overrides"
  ON user_overrides FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role can update user_overrides"
  ON user_overrides FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role can delete user_overrides"
  ON user_overrides FOR DELETE
  USING (true);

-- Allow service role to update plan_usage.plan (for admin override sync)
DROP POLICY IF EXISTS "Service role can update usage" ON plan_usage;

CREATE POLICY "Service role can update usage"
  ON plan_usage FOR UPDATE
  USING (true) WITH CHECK (true);

-- Allow service role to insert into plan_usage (for override upsert)
CREATE POLICY IF NOT EXISTS "Service role can insert usage"
  ON plan_usage FOR INSERT
  WITH CHECK (true);

-- Index for fast override lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_overrides_user_id ON user_overrides(user_id);

-- Index for admin audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
