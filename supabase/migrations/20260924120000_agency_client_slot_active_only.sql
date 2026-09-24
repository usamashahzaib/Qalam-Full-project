-- F1 fix: create_client_workspace_with_limit counted every client workspace
-- the owner had ever created, including archived ones. Archiving a churned
-- client (the only offboarding action the product offers) never returned
-- its slot, so a normal churn cycle (win five, lose one, try to win a
-- replacement) permanently locked the account out of its own plan after the
-- first churn. Count only workspaces that are still active.
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
  v_user_id uuid := p_user_id::uuid;
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

  perform pg_advisory_xact_lock(hashtextextended('agency-clients:' || v_user_id::text, 0));

  select count(*) into v_client_count
  from public.workspaces
  where owner_id = v_user_id
    and workspace_type = 'client'
    and archived_at is null;

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
    v_user_id,
    'client',
    v_contact_name,
    v_contact_email
  ) returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$$;

revoke all on function public.create_client_workspace_with_limit(text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.create_client_workspace_with_limit(text, text, text, text, integer)
  to service_role;
