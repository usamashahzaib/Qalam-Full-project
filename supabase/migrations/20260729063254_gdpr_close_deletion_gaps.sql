-- Closes two confirmed GDPR erasure gaps found by comparing delete_user_data()
-- against every user-owned table in production:
--
-- 1. voice_training_logs (writing samples + AI analysis in sample_text/ai_analysis)
--    and engagement_ledger (third-party contact names) have no FK to users and were
--    never deleted or documented as an intentional retention exception. They survive
--    account deletion indefinitely.
-- 2. payment_subscriptions.user_id has no FK constraint at all, so despite
--    20260723002400_document_gdpr_retention.sql documenting "SET NULL like payments",
--    nothing ever actually clears it - the deleted user's UUID stays attached forever.
--    payments.user_id has a real ON DELETE SET NULL FK and already behaves correctly;
--    payment_subscriptions needs the same behavior applied explicitly since it has no FK.
--
-- publishing_accounts is intentionally NOT listed here: it is keyed by workspace_id
-- (not user_id) and cascades automatically when delete_user_data() removes a
-- solely-owned, member-less workspace. For workspaces the deleted user still shares
-- with other members, publishing_accounts correctly survives - it holds workspace
-- publishing credentials, not the deleted user's personal data.
create or replace function public.delete_user_data(target_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.ai_usage where user_id = target_user_id;
  delete from public.scheduling_notifications where user_id = target_user_id;
  delete from public.approvals where post_id in (
    select id from public.posts where user_id = target_user_id::text
  );
  delete from public.post_versions where post_id in (
    select id from public.posts where user_id = target_user_id::text
  );
  delete from public.analytics_snapshots where user_id = target_user_id;
  delete from public.posts where user_id = target_user_id::text;
  delete from public.carousels where user_id = target_user_id::text;
  delete from public.voice_profiles where user_id = target_user_id::text;
  delete from public.voice_examples where user_id = target_user_id;
  delete from public.voice_training_logs where user_id = target_user_id::text;
  delete from public.engagement_ledger where user_id = target_user_id;
  delete from public.competitor_analyses where user_id = target_user_id::text;
  delete from public.conversations where user_id = target_user_id::text;
  delete from public.linkedin_credentials where user_id = target_user_id;
  delete from public.referrals where referrer_user_id = target_user_id;
  update public.payment_subscriptions set user_id = null where user_id = target_user_id;
  delete from public.plan_usage
    where user_id = target_user_id::text or user_uuid = target_user_id;
  delete from public.user_overrides where user_id = target_user_id::text;

  with successor as (
    select distinct on (wm.workspace_id)
      wm.workspace_id,
      u.id,
      u.email
    from public.workspace_members wm
    join public.users u on u.id::text = wm.user_id
    join public.workspaces w on w.id = wm.workspace_id
    where w.owner_id = target_user_id::text
      and u.id <> target_user_id
    order by
      wm.workspace_id,
      case wm.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 else 3 end,
      wm.created_at
  )
  update public.workspaces w
  set owner_id = successor.id::text,
      owner_email = successor.email,
      updated_at = now()
  from successor
  where w.id = successor.workspace_id;

  update public.workspace_members wm
  set role = 'owner'
  from public.workspaces w
  where wm.workspace_id = w.id
    and wm.user_id = w.owner_id
    and wm.role <> 'owner';

  delete from public.workspace_members where user_id = target_user_id::text;
  delete from public.workspaces
    where owner_id = target_user_id::text;
  delete from public.users where id = target_user_id;
end;
$$;

revoke all on function public.delete_user_data(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;

comment on function public.delete_user_data(uuid) is
  'GDPR erasure RPC. payments/payment_subscriptions intentionally survive deletion (financial recordkeeping legal obligation, GDPR Art 17(3)(b)) but have user_id cleared - payments via ON DELETE SET NULL FK, payment_subscriptions via explicit UPDATE since it has no FK. admin_audit_log similarly retains target_user_email as free text after deletion. Every other table with a user_id/owner_id/referrer_user_id FK to users cascades automatically; the DELETEs above are only for legacy text-keyed columns (no enforced FK) or tables needing an explicit order relative to their parent (approvals/post_versions before posts). publishing_accounts is workspace-keyed and cascades via workspace deletion, not listed here directly.';
