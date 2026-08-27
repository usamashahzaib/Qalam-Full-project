begin;

create or replace function public.save_match_profile_v1(
  p_workspace_id uuid,
  p_user_id uuid,
  p_domain text,
  p_opted_in boolean,
  p_display_name text,
  p_headline text,
  p_industry text,
  p_seniority text,
  p_location text,
  p_expertise text[],
  p_audience text[],
  p_goals text[],
  p_contact_email text,
  p_linkedin_url text,
  p_policy_version text,
  p_updated_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
  ) then
    raise exception 'match_profile_workspace_mismatch';
  end if;

  if p_opted_in and (
    coalesce(array_length(p_expertise, 1), 0) = 0
    or coalesce(array_length(p_audience, 1), 0) = 0
  ) then
    raise exception 'match_profile_signal_required';
  end if;

  insert into public.match_profiles (
    workspace_id, user_id, domain, opted_in, display_name, headline,
    industry, seniority, location, expertise, audience, goals,
    contact_email, linkedin_url, updated_at
  ) values (
    p_workspace_id, p_user_id, p_domain, p_opted_in, p_display_name, p_headline,
    p_industry, p_seniority, p_location, coalesce(p_expertise, '{}'),
    coalesce(p_audience, '{}'), coalesce(p_goals, '{}'),
    nullif(p_contact_email, ''), nullif(p_linkedin_url, ''), p_updated_at
  )
  on conflict (workspace_id) do update set
    user_id = excluded.user_id,
    domain = excluded.domain,
    opted_in = excluded.opted_in,
    display_name = excluded.display_name,
    headline = excluded.headline,
    industry = excluded.industry,
    seniority = excluded.seniority,
    location = excluded.location,
    expertise = excluded.expertise,
    audience = excluded.audience,
    goals = excluded.goals,
    contact_email = excluded.contact_email,
    linkedin_url = excluded.linkedin_url,
    updated_at = excluded.updated_at;

  insert into public.career_consents (
    workspace_id, user_id, purpose, granted, policy_version,
    granted_at, revoked_at, updated_at
  ) values (
    p_workspace_id, p_user_id, 'peer_matching', p_opted_in, p_policy_version,
    case when p_opted_in then p_updated_at else null end,
    case when p_opted_in then null else p_updated_at end,
    p_updated_at
  )
  on conflict (user_id, purpose) do update set
    workspace_id = excluded.workspace_id,
    granted = excluded.granted,
    policy_version = excluded.policy_version,
    granted_at = excluded.granted_at,
    revoked_at = excluded.revoked_at,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_match_profile_v1(
  uuid, uuid, text, boolean, text, text, text, text, text,
  text[], text[], text[], text, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.save_match_profile_v1(
  uuid, uuid, text, boolean, text, text, text, text, text,
  text[], text[], text[], text, text, text, timestamptz
) to service_role;

comment on function public.save_match_profile_v1(
  uuid, uuid, text, boolean, text, text, text, text, text,
  text[], text[], text[], text, text, text, timestamptz
) is 'Saves Signal Match visibility and peer matching consent atomically.';

commit;
