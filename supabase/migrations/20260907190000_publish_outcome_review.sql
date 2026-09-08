-- Resolve an uncertain LinkedIn outcome only after an operator verifies it.

create or replace function public.resolve_publish_outcome_review(
  p_post_id uuid,
  p_resolution text,
  p_post_urn text default null,
  p_note text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if p_resolution not in ('published', 'not_published') then
    raise exception 'invalid_publish_resolution';
  end if;

  update public.posts
  set
    status = case when p_resolution = 'published' then 'published' else 'failed' end,
    published_at = case when p_resolution = 'published' then coalesce(published_at, now()) else published_at end,
    linkedin_post_id = case when p_resolution = 'published' then coalesce(nullif(trim(p_post_urn), ''), linkedin_post_id) else linkedin_post_id end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_publish_error', case when p_resolution = 'published' then null else 'manually_verified_not_published' end,
      'publish_review_note', nullif(trim(coalesce(p_note, '')), ''),
      'publish_reviewed_at', now()
    ),
    updated_at = now()
  where id = p_post_id and status = 'publishing';

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke all on function public.resolve_publish_outcome_review(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_publish_outcome_review(uuid, text, text, text) to service_role;
