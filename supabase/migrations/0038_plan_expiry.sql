-- Plan expiry and renewal reminder state.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_sent_3d BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_sent_1d BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_plan_expires_at
  ON users(plan_expires_at)
  WHERE plan != 'Free';
