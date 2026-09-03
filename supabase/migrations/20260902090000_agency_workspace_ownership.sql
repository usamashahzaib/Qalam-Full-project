alter table public.workspaces
  add column if not exists workspace_type text not null default 'personal',
  add column if not exists client_contact_name text,
  add column if not exists client_contact_email text;

alter table public.workspaces
  drop constraint if exists workspaces_workspace_type_check;

alter table public.workspaces
  add constraint workspaces_workspace_type_check
  check (workspace_type in ('personal', 'client'));

update public.workspaces w
set workspace_type = 'client'
where exists (
  select 1
  from public.workspace_members wm
  where wm.workspace_id = w.id
    and wm.user_id = w.owner_id
    and wm.role = 'admin'
);

create index if not exists idx_workspaces_owner_type
  on public.workspaces (owner_id, workspace_type, created_at);

create or replace function public.create_client_workspace_with_limit(
  p_user_id text,
  p_name text,
  p_client_contact_name text default null,
  p_client_contact_email text default null,
  p_max_clients integer default 5
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_client_count integer;
  v_name text := trim(p_name);
  v_contact_name text := nullif(trim(coalesce(p_client_contact_name, '')), '');
  v_contact_email text := nullif(lower(trim(coalesce(p_client_contact_email, ''))), '');
begin
  if p_user_id is null or trim(p_user_id) = '' then
    raise exception 'client_workspace_user_required';
  end if;
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'client_workspace_name_invalid';
  end if;
  if v_contact_name is not null and length(v_contact_name) > 100 then
    raise exception 'client_contact_name_invalid';
  end if;
  if v_contact_email is not null and (length(v_contact_email) > 254 or v_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'client_contact_email_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('agency-clients:' || p_user_id, 0));

  select count(*) into v_client_count
  from public.workspaces
  where owner_id = p_user_id
    and workspace_type = 'client';

  if p_max_clients is not null and v_client_count >= p_max_clients then
    raise exception 'client_workspace_limit_reached';
  end if;

  insert into public.workspaces (
    name,
    owner_id,
    workspace_type,
    client_contact_name,
    client_contact_email
  ) values (
    v_name,
    p_user_id,
    'client',
    v_contact_name,
    v_contact_email
  ) returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_user_id, 'owner');

  return v_workspace_id;
end;
$$;

revoke all on function public.create_client_workspace_with_limit(text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_client_workspace_with_limit(text, text, text, text, integer)
  to service_role;

alter table public.competitor_analyses
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

update public.competitor_analyses analysis
set workspace_id = owner_workspace.workspace_id
from (
  select distinct on (wm.user_id) wm.user_id, wm.workspace_id
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  where w.workspace_type = 'personal'
  order by wm.user_id, wm.created_at asc
) owner_workspace
where analysis.workspace_id is null
  and analysis.user_id = owner_workspace.user_id;

create index if not exists idx_competitor_analyses_workspace_created
  on public.competitor_analyses (workspace_id, created_at desc);

-- Agency seats are account seats, not five fresh seats in every client
-- workspace. A teammate assigned to several clients consumes one seat.
create or replace function public.reserve_workspace_invite_with_limit(
  p_workspace_id uuid,
  p_email text,
  p_role text,
  p_invited_by uuid,
  p_expires_at timestamptz,
  p_seat_limit integer default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id text;
  v_workspace_type text;
  v_email text := lower(trim(p_email));
  v_reserved integer;
begin
  select owner_id, workspace_type into v_owner_id, v_workspace_type
  from public.workspaces where id = p_workspace_id;
  if v_owner_id is null then raise exception 'workspace_not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(
    case when v_workspace_type = 'client' then 'agency-seats:' || v_owner_id else 'workspace-seats:' || p_workspace_id::text end,
    0
  ));

  if v_workspace_type = 'client' then
    select count(*) into v_reserved from (
      select lower(u.email) as identity
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      join public.users u on u.id::text = wm.user_id
      where w.owner_id = v_owner_id and w.workspace_type = 'client'
      union
      select lower(wi.email) as identity
      from public.workspace_invites wi
      join public.workspaces w on w.id = wi.workspace_id
      where w.owner_id = v_owner_id and w.workspace_type = 'client' and wi.expires_at > now()
    ) identities
    where identity <> v_email;
  else
    select
      (select count(*) from public.workspace_members where workspace_id = p_workspace_id) +
      (select count(*) from public.workspace_invites where workspace_id = p_workspace_id and expires_at > now() and email <> v_email)
    into v_reserved;
  end if;

  if p_seat_limit is not null and v_reserved >= p_seat_limit then return false; end if;
  insert into public.workspace_invites (workspace_id, email, role, invited_by, expires_at, created_at)
  values (p_workspace_id, v_email, p_role, p_invited_by, p_expires_at, now())
  on conflict (workspace_id, email) do update
    set role = excluded.role, invited_by = excluded.invited_by, expires_at = excluded.expires_at, created_at = excluded.created_at;
  return true;
end;
$$;

create or replace function public.add_workspace_member_with_limit(
  p_workspace_id uuid,
  p_user_id uuid,
  p_role text,
  p_seat_limit integer default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id text;
  v_workspace_type text;
  v_user_email text;
  v_reserved integer;
begin
  select owner_id, workspace_type into v_owner_id, v_workspace_type
  from public.workspaces where id = p_workspace_id;
  if v_owner_id is null then raise exception 'workspace_not_found'; end if;
  if exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_user_id::text) then return true; end if;

  select lower(email) into v_user_email from public.users where id = p_user_id;
  perform pg_advisory_xact_lock(hashtextextended(
    case when v_workspace_type = 'client' then 'agency-seats:' || v_owner_id else 'workspace-seats:' || p_workspace_id::text end,
    0
  ));

  if v_workspace_type = 'client' then
    select count(*) into v_reserved from (
      select lower(u.email) as identity
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      join public.users u on u.id::text = wm.user_id
      where w.owner_id = v_owner_id and w.workspace_type = 'client'
      union
      select lower(wi.email) as identity
      from public.workspace_invites wi
      join public.workspaces w on w.id = wi.workspace_id
      where w.owner_id = v_owner_id and w.workspace_type = 'client' and wi.expires_at > now()
    ) identities
    where identity <> coalesce(v_user_email, 'user:' || p_user_id::text);
  else
    select count(*) into v_reserved from public.workspace_members where workspace_id = p_workspace_id;
  end if;

  if p_seat_limit is not null and v_reserved >= p_seat_limit then return false; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, p_user_id::text, p_role);
  return true;
end;
$$;

revoke all on function public.reserve_workspace_invite_with_limit(uuid, text, text, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.add_workspace_member_with_limit(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_workspace_invite_with_limit(uuid, text, text, uuid, timestamptz, integer) to service_role;
grant execute on function public.add_workspace_member_with_limit(uuid, uuid, text, integer) to service_role;
