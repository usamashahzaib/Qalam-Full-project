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
  v_reserved integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));
  select
    (select count(*) from public.workspace_members where workspace_id = p_workspace_id) +
    (select count(*) from public.workspace_invites where workspace_id = p_workspace_id and expires_at > now() and email <> lower(trim(p_email)))
  into v_reserved;
  if p_seat_limit is not null and v_reserved >= p_seat_limit then return false; end if;
  insert into public.workspace_invites (workspace_id, email, role, invited_by, expires_at, created_at)
  values (p_workspace_id, lower(trim(p_email)), p_role, p_invited_by, p_expires_at, now())
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
  v_members integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));
  if exists (select 1 from public.workspace_members where workspace_id = p_workspace_id and user_id = p_user_id) then return true; end if;
  select count(*) into v_members from public.workspace_members where workspace_id = p_workspace_id;
  if p_seat_limit is not null and v_members >= p_seat_limit then return false; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (p_workspace_id, p_user_id, p_role);
  return true;
end;
$$;

revoke all on function public.reserve_workspace_invite_with_limit(uuid, text, text, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.add_workspace_member_with_limit(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_workspace_invite_with_limit(uuid, text, text, uuid, timestamptz, integer) to service_role;
grant execute on function public.add_workspace_member_with_limit(uuid, uuid, text, integer) to service_role;
