create or replace function public.save_voice_training_sample(
  p_user_id text,
  p_samples jsonb,
  p_fingerprint jsonb,
  p_sample_text text,
  p_analysis jsonb,
  p_workspace_id uuid default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid;
  target_workspace_id uuid;
begin
  target_workspace_id := p_workspace_id;

  if target_workspace_id is null then
    select workspace_id into target_workspace_id
    from public.workspace_members
    where user_id = p_user_id::uuid
    order by created_at desc
    limit 1;
  end if;

  select id into target_id
  from public.voice_profiles
  where user_id = p_user_id
  order by updated_at desc nulls last
  limit 1;

  if target_id is null then
    insert into public.voice_profiles (
      user_id,
      workspace_id,
      sample_posts,
      voice_fingerprint,
      characteristics,
      updated_at
    ) values (
      p_user_id,
      target_workspace_id,
      coalesce(p_samples, '[]'::jsonb),
      coalesce(p_fingerprint, '{}'::jsonb),
      coalesce(p_analysis, '{}'::jsonb),
      now()
    );
  else
    update public.voice_profiles
    set workspace_id = coalesce(target_workspace_id, workspace_id),
        sample_posts = coalesce(p_samples, '[]'::jsonb),
        voice_fingerprint = coalesce(p_fingerprint, '{}'::jsonb),
        characteristics = coalesce(p_analysis, '{}'::jsonb),
        updated_at = now()
    where id = target_id;
  end if;

  insert into public.voice_training_logs (user_id, sample_text, ai_analysis)
  values (p_user_id, p_sample_text, coalesce(p_analysis, '{}'::jsonb));
end;
$$;

revoke all on function public.save_voice_training_sample(
  text,
  jsonb,
  jsonb,
  text,
  jsonb,
  uuid
) from public, anon, authenticated;

grant execute on function public.save_voice_training_sample(
  text,
  jsonb,
  jsonb,
  text,
  jsonb,
  uuid
) to service_role;
