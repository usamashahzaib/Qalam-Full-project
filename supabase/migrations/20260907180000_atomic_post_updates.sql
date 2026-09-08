-- Apply post edits, version history and metadata changes in one transaction.

create or replace function public.update_post_atomically(
  p_post_id uuid,
  p_workspace_id uuid,
  p_patch jsonb,
  p_created_by text default null
) returns setof public.posts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_post public.posts%rowtype;
begin
  select * into current_post
  from public.posts
  where id = p_post_id and workspace_id = p_workspace_id
  for update;

  if not found then
    return;
  end if;

  if current_post.status = 'publishing' then
    raise exception 'post_is_publishing';
  end if;

  if p_patch ? 'content'
     and (p_patch ->> 'content') is distinct from current_post.content then
    insert into public.post_versions (post_id, version_number, content, created_by)
    values (
      current_post.id,
      coalesce((select max(version_number) + 1 from public.post_versions where post_id = current_post.id), 1),
      coalesce(current_post.content, ''),
      p_created_by
    );
  end if;

  return query
  update public.posts
  set
    title = case when p_patch ? 'title' then p_patch ->> 'title' else title end,
    content = case when p_patch ? 'content' then p_patch ->> 'content' else content end,
    status = case when p_patch ? 'status' then p_patch ->> 'status' else status end,
    scheduled_for = case when p_patch ? 'scheduledTime' then (p_patch ->> 'scheduledTime')::timestamptz else scheduled_for end,
    published_at = case when p_patch ? 'publishedAt' then (p_patch ->> 'publishedAt')::timestamptz else published_at end,
    linkedin_post_id = case when p_patch ? 'externalPostUrn' then p_patch ->> 'externalPostUrn' else linkedin_post_id end,
    engagement_score = case when p_patch ? 'engagementScore' then (p_patch ->> 'engagementScore')::integer else engagement_score end,
    metadata = case
      when p_patch ? 'type' then jsonb_set(coalesce(metadata, '{}'::jsonb), '{type}', to_jsonb(p_patch ->> 'type'), true)
      else metadata
    end,
    updated_at = now()
  where id = p_post_id and workspace_id = p_workspace_id
  returning *;
end;
$$;

revoke all on function public.update_post_atomically(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.update_post_atomically(uuid, uuid, jsonb, text) to service_role;
