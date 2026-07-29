begin;

-- Repair legacy workspace identities before enforcing internal user UUIDs.
with successor as (
  select distinct on (wm.workspace_id)
    wm.workspace_id,
    u.id,
    u.email
  from public.workspace_members wm
  join public.users u on u.id::text = wm.user_id
  join public.workspaces w on w.id = wm.workspace_id
  left join public.users owner_user on owner_user.id::text = w.owner_id
  where owner_user.id is null
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

delete from public.workspace_members wm
where not exists (
  select 1 from public.users u where u.id::text = wm.user_id
);

delete from public.workspaces w
where not exists (
  select 1 from public.users u where u.id::text = w.owner_id
);

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('workspaces', 'workspace_members')
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  end loop;
end
$$;

alter table public.workspace_members
  alter column user_id type uuid using user_id::uuid;

alter table public.workspaces
  alter column owner_id type uuid using owner_id::uuid,
  alter column owner_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workspace_members'::regclass
      and conname = 'workspace_members_user_id_fkey'
  ) then
    alter table public.workspace_members
      add constraint workspace_members_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.workspaces'::regclass
      and conname = 'workspaces_owner_id_fkey'
  ) then
    alter table public.workspaces
      add constraint workspaces_owner_id_fkey
      foreign key (owner_id) references public.users(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.payment_subscriptions'::regclass
      and conname = 'payment_subscriptions_user_id_fkey'
  ) then
    alter table public.payment_subscriptions
      add constraint payment_subscriptions_user_id_fkey
      foreign key (user_id) references public.users(id) on delete set null;
  end if;
end
$$;

create or replace function public.provision_oauth_user(
  p_external_id text,
  p_email text,
  p_full_name text,
  p_image_url text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_workspace_id uuid;
begin
  select u.id, wm.workspace_id
  into v_user_id, v_workspace_id
  from public.users u
  left join public.workspace_members wm on wm.user_id = u.id
  where u.external_user_id = p_external_id
  order by wm.created_at desc nulls last
  limit 1;

  if v_user_id is not null then
    return jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
  end if;

  v_user_id := gen_random_uuid();
  v_workspace_id := gen_random_uuid();

  insert into public.users (
    id,
    external_user_id,
    email,
    full_name,
    image_url,
    auth_provider,
    email_verified,
    plan,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_external_id,
    p_email,
    p_full_name,
    p_image_url,
    'oauth',
    true,
    'Free',
    now(),
    now()
  );

  insert into public.plan_usage (
    user_id,
    plan,
    ai_drafts_used,
    carousels_used,
    hooks_used,
    analyses_used,
    competitor_runs_used,
    cycle_start,
    cycle_end,
    user_uuid
  ) values (
    v_user_id::text,
    'free',
    0,
    0,
    0,
    0,
    0,
    now(),
    now() + interval '1 month',
    v_user_id
  ) on conflict (user_id) do nothing;

  insert into public.workspaces (
    id,
    name,
    owner_id,
    owner_email,
    slug,
    created_at,
    updated_at
  ) values (
    v_workspace_id,
    'My Workspace',
    v_user_id,
    p_email,
    'workspace-' || left(p_external_id, 8),
    now(),
    now()
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return jsonb_build_object('user_id', v_user_id, 'workspace_id', v_workspace_id);
end;
$$;

drop function if exists public.create_workspace_with_member(text, text, text);
create function public.create_workspace_with_member(
  p_user_id uuid,
  p_name text,
  p_role text default 'owner'
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (p_name, p_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (
    v_workspace_id,
    p_user_id,
    case
      when p_role in ('owner', 'admin', 'editor', 'viewer', 'client_reviewer') then p_role
      else 'owner'
    end
  );

  return v_workspace_id;
end;
$$;

drop function if exists public.create_personal_workspace(text, text);
create function public.create_personal_workspace(
  p_user_id uuid,
  p_name text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.workspaces (name, owner_id)
  values (p_name, p_user_id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_user_id, 'owner');

  return v_workspace_id;
end;
$$;

-- One paid add-on order can contain multiple resume credits.
alter table public.career_addon_orders
  add column if not exists credits_consumed integer not null default 0;

update public.career_addon_orders
set credits_consumed = 1
where addon_key = 'extra_resume'
  and consumed_at is not null
  and credits_consumed = 0;

update public.career_addon_orders
set consumed_at = null
where addon_key = 'extra_resume'
  and credits_consumed < quantity;

alter table public.career_addon_orders
  drop constraint if exists career_addon_orders_credits_consumed_check;
alter table public.career_addon_orders
  add constraint career_addon_orders_credits_consumed_check
  check (credits_consumed between 0 and quantity);

drop index if exists public.career_addon_resume_credit_idx;
create index career_addon_resume_credit_idx
  on public.career_addon_orders (user_id, created_at)
  where addon_key = 'extra_resume'
    and status in ('paid', 'fulfilled')
    and credits_consumed < quantity;

create or replace function public.claim_extra_resume_credit(p_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  select id into v_order_id
  from public.career_addon_orders
  where user_id = p_user_id
    and addon_key = 'extra_resume'
    and status in ('paid', 'fulfilled')
    and credits_consumed < quantity
  order by created_at
  for update skip locked
  limit 1;

  if v_order_id is null then
    return null;
  end if;

  update public.career_addon_orders
  set credits_consumed = credits_consumed + 1,
      consumed_at = case when credits_consumed + 1 >= quantity then now() else null end,
      updated_at = now()
  where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.release_extra_resume_credit(
  p_user_id uuid,
  p_order_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_released boolean;
begin
  update public.career_addon_orders
  set credits_consumed = credits_consumed - 1,
      consumed_at = null,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and addon_key = 'extra_resume'
    and credits_consumed > 0
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

create or replace function public.consume_extra_resume_credit(p_user_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select public.claim_extra_resume_credit(p_user_id) is not null;
$$;

create or replace function public.refund_career_usage(
  p_user_id uuid,
  p_feature text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_refunded boolean;
begin
  if p_feature not in ('linkedin_audit', 'resume_review', 'resume_generation') then
    raise exception 'invalid career feature';
  end if;

  update public.career_usage
  set linkedin_audits_used = case
        when p_feature = 'linkedin_audit' then greatest(linkedin_audits_used - 1, 0)
        else linkedin_audits_used
      end,
      resume_reviews_used = case
        when p_feature = 'resume_review' then greatest(resume_reviews_used - 1, 0)
        else resume_reviews_used
      end,
      resume_generations_used = case
        when p_feature = 'resume_generation' then greatest(resume_generations_used - 1, 0)
        else resume_generations_used
      end,
      updated_at = now()
  where user_id = p_user_id
    and period_start = v_period
  returning true into v_refunded;

  return coalesce(v_refunded, false);
end;
$$;

alter function public.consume_career_usage(uuid, text, integer) security invoker;

-- Atomic manual publish claim. Redis remains an optional fast lock.
create or replace function public.claim_manual_linkedin_publish(
  p_post_id uuid,
  p_workspace_id uuid,
  p_content text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_content text;
  v_score integer;
  v_linkedin_post_id text;
begin
  select status, content, engagement_score, linkedin_post_id
  into v_status, v_content, v_score, v_linkedin_post_id
  from public.posts
  where id = p_post_id
    and workspace_id = p_workspace_id
  for update;

  if not found then return 'not_found'; end if;
  if v_status = 'published' or v_linkedin_post_id is not null then return 'published'; end if;
  if v_status = 'publishing' then return 'busy'; end if;
  if btrim(coalesce(v_content, '')) <> btrim(coalesce(p_content, '')) then return 'content_changed'; end if;
  if coalesce(v_score, 0) < 82 then return 'score_too_low'; end if;
  if v_status not in ('draft', 'approved', 'scheduled', 'notified', 'failed') then return 'not_ready'; end if;

  update public.posts
  set status = 'publishing',
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('manual_publish_previous_status', v_status),
      updated_at = now()
  where id = p_post_id;

  return 'claimed';
end;
$$;

create or replace function public.release_manual_linkedin_publish(
  p_post_id uuid,
  p_workspace_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_released boolean;
begin
  update public.posts
  set status = case metadata ->> 'manual_publish_previous_status'
        when 'approved' then 'approved'
        when 'scheduled' then 'scheduled'
        when 'notified' then 'notified'
        when 'failed' then 'failed'
        else 'draft'
      end,
      metadata = coalesce(metadata, '{}'::jsonb) - 'manual_publish_previous_status',
      updated_at = now()
  where id = p_post_id
    and workspace_id = p_workspace_id
    and status = 'publishing'
    and metadata ? 'manual_publish_previous_status'
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

create or replace function public.finalize_manual_linkedin_publish(
  p_post_id uuid,
  p_workspace_id uuid,
  p_account_id uuid,
  p_post_urn text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated boolean;
begin
  update public.posts
  set status = 'published',
      published_at = now(),
      linkedin_post_id = p_post_urn,
      metadata = (coalesce(metadata, '{}'::jsonb) - 'manual_publish_previous_status')
        || jsonb_build_object('last_publish_error', null),
      updated_at = now()
  where id = p_post_id
    and workspace_id = p_workspace_id
    and status = 'publishing'
  returning true into v_updated;

  if not coalesce(v_updated, false) then
    return false;
  end if;

  insert into public.publish_logs (
    post_id,
    account_id,
    status,
    error_message,
    provider_response
  ) values (
    p_post_id,
    p_account_id,
    'success',
    null,
    jsonb_build_object('postUrn', p_post_urn)
  );

  return true;
end;
$$;

create or replace function public.append_resume_version(
  p_resume_id uuid,
  p_resume_data jsonb,
  p_analysis jsonb
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_resume_id::text, 0));

  select coalesce(max(version_number), 0) + 1
  into v_version
  from public.resume_versions
  where resume_id = p_resume_id;

  insert into public.resume_versions (
    resume_id,
    version_number,
    resume_data,
    analysis
  ) values (
    p_resume_id,
    v_version,
    p_resume_data,
    coalesce(p_analysis, '{}'::jsonb)
  );

  return v_version;
end;
$$;

-- Recreate GDPR erasure after identity columns become UUID.
create or replace function public.delete_user_data(target_user_id uuid)
returns void
language plpgsql
security invoker
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
    join public.users u on u.id = wm.user_id
    join public.workspaces w on w.id = wm.workspace_id
    where w.owner_id = target_user_id
      and u.id <> target_user_id
    order by
      wm.workspace_id,
      case wm.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 else 3 end,
      wm.created_at
  )
  update public.workspaces w
  set owner_id = successor.id,
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

  delete from public.workspace_members where user_id = target_user_id;
  delete from public.workspaces where owner_id = target_user_id;
  delete from public.users where id = target_user_id;
end;
$$;

revoke all on function public.claim_extra_resume_credit(uuid) from public, anon, authenticated;
revoke all on function public.release_extra_resume_credit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.consume_extra_resume_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_career_usage(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_manual_linkedin_publish(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.release_manual_linkedin_publish(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finalize_manual_linkedin_publish(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.append_resume_version(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.delete_user_data(uuid) from public, anon, authenticated;
revoke all on function public.provision_oauth_user(text, text, text, text) from public, anon, authenticated;
revoke all on function public.create_workspace_with_member(uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_personal_workspace(uuid, text) from public, anon, authenticated;

grant execute on function public.claim_extra_resume_credit(uuid) to service_role;
grant execute on function public.release_extra_resume_credit(uuid, uuid) to service_role;
grant execute on function public.consume_extra_resume_credit(uuid) to service_role;
grant execute on function public.refund_career_usage(uuid, text) to service_role;
grant execute on function public.claim_manual_linkedin_publish(uuid, uuid, text) to service_role;
grant execute on function public.release_manual_linkedin_publish(uuid, uuid) to service_role;
grant execute on function public.finalize_manual_linkedin_publish(uuid, uuid, uuid, text) to service_role;
grant execute on function public.append_resume_version(uuid, jsonb, jsonb) to service_role;
grant execute on function public.delete_user_data(uuid) to service_role;
grant execute on function public.provision_oauth_user(text, text, text, text) to service_role;
grant execute on function public.create_workspace_with_member(uuid, text, text) to service_role;
grant execute on function public.create_personal_workspace(uuid, text) to service_role;

commit;
