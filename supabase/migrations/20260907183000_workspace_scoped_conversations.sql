-- Keep strategist history inside the workspace where it was created.

alter table public.conversations
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Backfill only when the owner has exactly one personal workspace. Ambiguous
-- legacy rows remain unassigned and are hidden by workspace-scoped queries.
with user_personal_workspaces as (
  select u.external_user_id, u.id as internal_user_id,
         (array_agg(w.id order by w.created_at, w.id))[1] as workspace_id,
         count(*) as workspace_count
  from public.users u
  join public.workspaces w on w.owner_id = u.id and w.workspace_type = 'personal'
  group by u.external_user_id, u.id
)
update public.conversations c
set workspace_id = candidate.workspace_id
from user_personal_workspaces candidate
where c.workspace_id is null
  and candidate.workspace_count = 1
  and (c.user_id = candidate.external_user_id or c.user_id = candidate.internal_user_id::text);

create index if not exists idx_conversations_workspace_user_updated
  on public.conversations (workspace_id, user_id, updated_at desc);

create or replace function public.create_workspace_conversation_with_message(
  p_workspace_id uuid,
  p_user_id text,
  p_title text,
  p_role_context text,
  p_message text,
  p_assistant_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_id uuid;
begin
  insert into public.conversations (workspace_id, user_id, title, role_context)
  values (p_workspace_id, p_user_id, p_title, p_role_context)
  returning id into conversation_id;

  insert into public.conversation_messages (conversation_id, role, content)
  values (conversation_id, 'user', p_message);

  if p_assistant_message is not null and length(trim(p_assistant_message)) > 0 then
    insert into public.conversation_messages (conversation_id, role, content)
    values (conversation_id, 'assistant', p_assistant_message);
  end if;

  return conversation_id;
end;
$$;

create or replace function public.append_workspace_conversation_turn(
  p_workspace_id uuid,
  p_user_id text,
  p_conversation_id uuid,
  p_user_message text,
  p_assistant_message text,
  p_role_context text,
  p_title text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id
      and workspace_id = p_workspace_id
      and user_id = p_user_id
  ) then
    raise exception 'conversation_not_found';
  end if;

  insert into public.conversation_messages (conversation_id, role, content)
  values
    (p_conversation_id, 'user', p_user_message),
    (p_conversation_id, 'assistant', p_assistant_message);

  update public.conversations
  set updated_at = now(), role_context = p_role_context,
      title = coalesce(nullif(trim(p_title), ''), title)
  where id = p_conversation_id
    and workspace_id = p_workspace_id
    and user_id = p_user_id;

  return p_conversation_id;
end;
$$;

revoke all on function public.create_workspace_conversation_with_message(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.append_workspace_conversation_turn(uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_workspace_conversation_with_message(uuid, text, text, text, text, text) to service_role;
grant execute on function public.append_workspace_conversation_turn(uuid, text, uuid, text, text, text, text) to service_role;
