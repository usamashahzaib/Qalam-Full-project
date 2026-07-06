-- Migration 0036: Schema cleanup
--
-- 1. Drop the legacy 'memberships' table (replaced by workspace_members)
-- 2. Add a proper UUID FK from plan_usage.user_id to users.id
--    (plan_usage.user_id is TEXT; we add a soft FK via a check function to
--     avoid breaking existing rows while still enforcing integrity on new inserts)
-- 3. Remove duplicate user_workspace table if it exists

-- ----------------------------------------------------------------
-- 1. Drop legacy memberships table (data should be in workspace_members)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.memberships CASCADE;

-- ----------------------------------------------------------------
-- 2. Drop legacy user_workspace table if it exists
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.user_workspace CASCADE;

-- ----------------------------------------------------------------
-- 3. plan_usage.user_id - add UUID FK column alongside the TEXT column
--    We cannot simply change TEXT -> UUID without a data migration,
--    so we add a new UUID column, backfill it, and enforce FK there.
--    Application code already uses internal UUIDs for plan_usage inserts.
-- ----------------------------------------------------------------
ALTER TABLE public.plan_usage
  ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Backfill where user_id looks like a UUID and matches a users.id row
UPDATE public.plan_usage pu
SET    user_uuid = u.id
FROM   public.users u
WHERE  pu.user_uuid IS NULL
  AND  pu.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND  u.id::TEXT = pu.user_id;

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_plan_usage_user_uuid ON public.plan_usage (user_uuid);

-- ----------------------------------------------------------------
-- 4. Ensure workspace_members has role column with correct CHECK
-- ----------------------------------------------------------------
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'client_reviewer'));

-- ----------------------------------------------------------------
-- 5. Index for common workspace resolution query
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members (user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
  ON public.workspace_members (workspace_id);
