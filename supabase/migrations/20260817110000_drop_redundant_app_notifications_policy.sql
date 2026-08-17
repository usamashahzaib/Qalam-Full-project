-- Drop the redundant app_notifications_service_only policy.
--
-- service_role bypasses RLS entirely, so a policy scoped "for all to service_role
-- using (true)" never grants anything the role does not already have. The real
-- access control on this table is the `revoke all ... from anon, authenticated`
-- applied in 20260730000000_app_notifications.sql, which stays in force. With RLS
-- enabled and no policies, anon/authenticated are denied by default (and by the
-- revoke), while service_role continues to read/write via its RLS bypass.
--
-- This clears the check:rls finding (an unconditional policy scoped to service_role)
-- without changing effective access. Re-assert the revoke idempotently so this
-- migration is self-contained.

drop policy if exists "app_notifications_service_only" on public.app_notifications;

revoke all on public.app_notifications from anon, authenticated;
grant select, insert, update, delete on public.app_notifications to service_role;
