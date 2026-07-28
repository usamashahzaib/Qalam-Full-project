alter table public.career_addon_orders
  add column if not exists consumed_at timestamptz;

create index if not exists career_addon_resume_credit_idx
  on public.career_addon_orders (user_id, created_at)
  where addon_key = 'extra_resume'
    and status in ('paid', 'fulfilled')
    and consumed_at is null;

create or replace function public.consume_extra_resume_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  select id into v_order_id
  from public.career_addon_orders
  where user_id = p_user_id
    and addon_key = 'extra_resume'
    and status in ('paid', 'fulfilled')
    and consumed_at is null
  order by created_at
  for update skip locked
  limit 1;

  if v_order_id is null then
    return false;
  end if;

  update public.career_addon_orders
  set consumed_at = now(), updated_at = now()
  where id = v_order_id;
  return true;
end;
$$;

revoke all on function public.consume_extra_resume_credit(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_extra_resume_credit(uuid)
  to service_role;
