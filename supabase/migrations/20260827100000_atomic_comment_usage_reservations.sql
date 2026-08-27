-- Reserve comment-generation quota before a model call. This prevents parallel
-- extension or app requests from spending more AI budget than the plan allows.
create or replace function public.reserve_comment_generation(p_user_id text, p_limit integer)
returns table(allowed boolean, current integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
begin
  if p_limit < 1 then
    return query select false, 0;
    return;
  end if;

  insert into public.plan_usage (user_id, plan, comment_generations_used)
  values (p_user_id, 'free', 1)
  on conflict (user_id) do update
    set comment_generations_used = public.plan_usage.comment_generations_used + 1,
        updated_at = now()
    where public.plan_usage.comment_generations_used < p_limit
  returning comment_generations_used into v_current;

  if found then
    return query select true, v_current;
    return;
  end if;

  select coalesce(comment_generations_used, 0)
    into v_current
    from public.plan_usage
   where user_id = p_user_id;
  return query select false, coalesce(v_current, 0);
end;
$$;

create or replace function public.release_comment_generation(p_user_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.plan_usage
     set comment_generations_used = greatest(comment_generations_used - 1, 0),
         updated_at = now()
   where user_id = p_user_id
     and comment_generations_used > 0;
$$;

revoke all on function public.reserve_comment_generation(text, integer) from public, anon, authenticated;
revoke all on function public.release_comment_generation(text) from public, anon, authenticated;
grant execute on function public.reserve_comment_generation(text, integer) to service_role;
grant execute on function public.release_comment_generation(text) to service_role;
