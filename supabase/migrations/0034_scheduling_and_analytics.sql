-- Migration 0034: Scheduling notifications + manual analytics snapshots

-- ----------------------------------------------------------------
-- 1. Scheduling notification log
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduling_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  email      TEXT,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sched_notif_post_id ON public.scheduling_notifications (post_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_user_id ON public.scheduling_notifications (user_id);

ALTER TABLE public.scheduling_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.scheduling_notifications
  USING (false) WITH CHECK (false);

-- ----------------------------------------------------------------
-- 2. Manual analytics snapshots (Phase 1: user-entered data)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID        REFERENCES public.posts(id) ON DELETE SET NULL,
  workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  impressions     INTEGER     NOT NULL DEFAULT 0,
  reactions       INTEGER     NOT NULL DEFAULT 0,
  comments        INTEGER     NOT NULL DEFAULT 0,
  reposts         INTEGER     NOT NULL DEFAULT 0,
  follower_delta  INTEGER     NOT NULL DEFAULT 0,
  notes           TEXT,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_workspace ON public.analytics_snapshots (workspace_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_post_id   ON public.analytics_snapshots (post_id);

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_member_read" ON public.analytics_snapshots
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. Add 'notified' to posts status if not already present
-- ----------------------------------------------------------------
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

-- Re-add with extended values (posts table may not have a constraint yet)
-- Using IF NOT EXISTS pattern via a DO block for safety
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'posts' AND constraint_name = 'posts_status_check'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_status_check
      CHECK (status IN ('draft','pending_approval','approved','rejected','scheduled','notified','published','failed','archived'));
  END IF;
END $$;
