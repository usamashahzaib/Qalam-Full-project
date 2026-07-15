-- ----------------------------------------------------------------
-- Add 'publishing' to posts.status check constraint.
--
-- Used as a transient state by lib/server/linkedin-publish.ts between a
-- scheduled post being claimed for publish and the LinkedIn API call
-- resolving. The claim is a conditional UPDATE (scheduled -> publishing)
-- that only succeeds once, which is what prevents the QStash webhook and the
-- daily safety-net cron from double-publishing the same post if they ever
-- race for it.
-- ----------------------------------------------------------------

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft','pending_approval','approved','rejected','scheduled','notified','publishing','published','failed','archived'));
