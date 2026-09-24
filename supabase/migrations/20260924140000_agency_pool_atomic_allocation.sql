-- Makes every change to an agency owner's shared draft/carousel pool atomic.
--
-- 20260924130000 added per-workspace allowances, but the rules were enforced
-- in application code with a read, then a separate write:
--   * a failed sibling lookup read as "nothing allocated" and let any
--     allocation through;
--   * two concurrent edits could each pass the check and together overshoot;
--   * resetting a workspace to the plan default was never checked;
--   * a new client workspace always started at the default share, even when
--     the pool was already fully allocated elsewhere;
--   * restoring an archived workspace checked the slot count but not the pool.
--
-- Each function below takes the same per-owner advisory lock as
-- create_client_workspace_with_limit, so allocation edits, creates and
-- restores for one owner are serialized, and reads its inputs inside that
-- lock. Pool sizes and default shares are passed in by the caller from
-- lib/pricing.ts, which stays the single source of truth for those numbers.
-- "Effective allowance" means the stored value, or the default when null.

-- Internal: shrink one active client workspace so the owner's pool is never
-- oversubscribed. The caller must already hold the owner's advisory lock.
create or replace function public.agency_fit_client_workspace_to_pool(
  p_workspace_id uuid,
  p_owner_id uuid,
  p_draft_pool integer,
  p_carousel_pool integer,
  p_draft_default integer,
  p_carousel_default integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft integer;
  v_carousel integer;
  v_other_drafts integer;
  v_other_carousels integer;
  v_draft_room integer;
  v_carousel_room integer;
  v_clamped boolean := false;
begin
  select coalesce(monthly_draft_allowance, p_draft_default),
         coalesce(monthly_carousel_allowance, p_carousel_default)
    into v_draft, v_carousel
  from public.workspaces
  where id = p_workspace_id;

  select coalesce(sum(coalesce(monthly_draft_allowance, p_draft_default)), 0),
         coalesce(sum(coalesce(monthly_carousel_allowance, p_carousel_default)), 0)
    into v_other_drafts, v_other_carousels
  from public.workspaces
  where owner_id = p_owner_id
    and workspace_type = 'client'
    and archived_at is null
    and id <> p_workspace_id;

  v_draft_room := greatest(0, p_draft_pool - v_other_drafts);
  v_carousel_room := greatest(0, p_carousel_pool - v_other_carousels);

  if v_draft > v_draft_room then
    v_draft := v_draft_room;
    v_clamped := true;
    update public.workspaces set monthly_draft_allowance = v_draft, updated_at = now() where id = p_workspace_id;
  end if;
  if v_carousel > v_carousel_room then
    v_carousel := v_carousel_room;
    v_clamped := true;
    update public.workspaces set monthly_carousel_allowance = v_carousel, updated_at = now() where id = p_workspace_id;
  end if;

  return jsonb_build_object('draftAllowance', v_draft, 'carouselAllowance', v_carousel, 'clamped', v_clamped);
end;
$$;

revoke all on function public.agency_fit_client_workspace_to_pool(uuid, uuid, integer, integer, integer, integer)
  from public, anon, authenticated, service_role;

-- Sets one or both allowances for a client workspace, validating the
-- effective result (a null request means "back to the default share", which
-- must fit too) against everything else the owner has allocated.
create or replace function public.set_client_workspace_allowance(
  p_workspace_id uuid,
  p_set_draft boolean,
  p_draft integer,
  p_set_carousel boolean,
  p_carousel integer,
  p_draft_pool integer,
  p_carousel_pool integer,
  p_draft_default integer,
  p_carousel_default integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_other integer;
  v_requested integer;
begin
  select owner_id into v_owner_id
  from public.workspaces
  where id = p_workspace_id and workspace_type = 'client';
  if v_owner_id is null then
    raise exception 'workspace_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('agency-clients:' || v_owner_id::text, 0));

  if p_set_draft then
    if p_draft is not null and p_draft < 0 then
      return jsonb_build_object('ok', false, 'error', 'allocation_negative', 'feature', 'drafts');
    end if;
    select coalesce(sum(coalesce(monthly_draft_allowance, p_draft_default)), 0) into v_other
    from public.workspaces
    where owner_id = v_owner_id and workspace_type = 'client' and archived_at is null and id <> p_workspace_id;
    v_requested := coalesce(p_draft, p_draft_default);
    if v_other + v_requested > p_draft_pool then
      return jsonb_build_object('ok', false, 'error', 'allocation_exceeds_pool', 'feature', 'drafts',
        'poolTotal', p_draft_pool, 'allocatedToOthers', v_other, 'requested', v_requested,
        'remaining', greatest(0, p_draft_pool - v_other));
    end if;
  end if;

  if p_set_carousel then
    if p_carousel is not null and p_carousel < 0 then
      return jsonb_build_object('ok', false, 'error', 'allocation_negative', 'feature', 'carousels');
    end if;
    select coalesce(sum(coalesce(monthly_carousel_allowance, p_carousel_default)), 0) into v_other
    from public.workspaces
    where owner_id = v_owner_id and workspace_type = 'client' and archived_at is null and id <> p_workspace_id;
    v_requested := coalesce(p_carousel, p_carousel_default);
    if v_other + v_requested > p_carousel_pool then
      return jsonb_build_object('ok', false, 'error', 'allocation_exceeds_pool', 'feature', 'carousels',
        'poolTotal', p_carousel_pool, 'allocatedToOthers', v_other, 'requested', v_requested,
        'remaining', greatest(0, p_carousel_pool - v_other));
    end if;
  end if;

  update public.workspaces
  set monthly_draft_allowance = case when p_set_draft then p_draft else monthly_draft_allowance end,
      monthly_carousel_allowance = case when p_set_carousel then p_carousel else monthly_carousel_allowance end,
      updated_at = now()
  where id = p_workspace_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_client_workspace_allowance(uuid, boolean, integer, boolean, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.set_client_workspace_allowance(uuid, boolean, integer, boolean, integer, integer, integer, integer, integer)
  to service_role;

-- Restores an archived client workspace: re-checks the active-slot limit and
-- fits the workspace back into whatever share of the pool is still free, all
-- under the owner's lock so it cannot race a concurrent create or restore.
create or replace function public.restore_client_workspace(
  p_workspace_id uuid,
  p_max_clients integer,
  p_draft_pool integer,
  p_carousel_pool integer,
  p_draft_default integer,
  p_carousel_default integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_active integer;
begin
  select owner_id into v_owner_id
  from public.workspaces
  where id = p_workspace_id and workspace_type = 'client';
  if v_owner_id is null then
    raise exception 'workspace_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('agency-clients:' || v_owner_id::text, 0));

  select count(*) into v_active
  from public.workspaces
  where owner_id = v_owner_id and workspace_type = 'client' and archived_at is null and id <> p_workspace_id;

  if p_max_clients is not null and v_active >= p_max_clients then
    raise exception 'client_workspace_limit_reached';
  end if;

  update public.workspaces set archived_at = null, updated_at = now() where id = p_workspace_id;

  return public.agency_fit_client_workspace_to_pool(
    p_workspace_id, v_owner_id, p_draft_pool, p_carousel_pool, p_draft_default, p_carousel_default
  );
end;
$$;

revoke all on function public.restore_client_workspace(uuid, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.restore_client_workspace(uuid, integer, integer, integer, integer, integer)
  to service_role;

-- Client workspace creation, now also fitting the new workspace into the pool
-- when the caller passes the pool sizes. The four new parameters default to
-- null, so a caller still using the five-argument form keeps working (it just
-- skips the fit), which keeps this safe in either deploy order.
drop function if exists public.create_client_workspace_with_limit(text, text, text, text, integer);

create or replace function public.create_client_workspace_with_limit(
  p_user_id text,
  p_name text,
  p_client_contact_name text default null,
  p_client_contact_email text default null,
  p_max_clients integer default 5,
  p_draft_pool integer default null,
  p_carousel_pool integer default null,
  p_draft_default integer default null,
  p_carousel_default integer default null
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

  if p_draft_pool is not null and p_carousel_pool is not null and p_draft_default is not null and p_carousel_default is not null then
    perform public.agency_fit_client_workspace_to_pool(
      v_workspace_id, v_user_id, p_draft_pool, p_carousel_pool, p_draft_default, p_carousel_default
    );
  end if;

  return v_workspace_id;
end;
$$;

revoke all on function public.create_client_workspace_with_limit(text, text, text, text, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_client_workspace_with_limit(text, text, text, text, integer, integer, integer, integer, integer)
  to service_role;
