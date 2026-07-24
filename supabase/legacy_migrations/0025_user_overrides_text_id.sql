-- Retype user_overrides.user_id from UUID to TEXT so it can store either
-- a Supabase internal UUID (credentials users) or a LinkedIn provider ID (OAuth users)
-- Both match the plan_usage.user_id TEXT column which is the actual lookup key.

-- Drop FK constraint and recreate as TEXT
ALTER TABLE user_overrides DROP CONSTRAINT IF EXISTS user_overrides_user_id_fkey;
ALTER TABLE user_overrides ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE user_overrides DROP CONSTRAINT IF EXISTS user_overrides_user_id_key;
ALTER TABLE user_overrides ADD CONSTRAINT user_overrides_user_id_unique UNIQUE (user_id);

-- Recreate index
DROP INDEX IF EXISTS idx_user_overrides_user_id;
CREATE INDEX idx_user_overrides_user_id ON user_overrides(user_id);
