alter table public.payments
  drop constraint if exists payments_billing_cycle_check;
alter table public.payments
  add constraint payments_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'annual'));

alter table public.payment_subscriptions
  drop constraint if exists payment_subscriptions_billing_cycle_check;
alter table public.payment_subscriptions
  add constraint payment_subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'annual'));

create or replace function public.activate_plan(
  p_user_id uuid,
  p_organization_id uuid,
  p_plan_name text,
  p_expires_at timestamptz,
  p_customer_id text,
  p_billing_cycle text
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_cycle text := lower(coalesce(p_billing_cycle, 'quarterly'));
begin
  if p_plan_name not in ('Solo', 'Pro') then
    raise exception 'invalid paid plan: %', p_plan_name;
  end if;

  if v_cycle not in ('monthly', 'quarterly', 'annual') then
    raise exception 'invalid billing cycle: %', p_billing_cycle;
  end if;

  update public.users
  set plan = p_plan_name,
      plan_expires_at = p_expires_at,
      plan_started_at = v_now,
      billing_cycle = v_cycle,
      customer_id = coalesce(p_customer_id, customer_id),
      reminder_sent_3d = false,
      reminder_sent_1d = false,
      updated_at = v_now
  where id = p_user_id;

  if not found then
    raise exception 'user not found: %', p_user_id;
  end if;

  if p_organization_id is not null then
    update public.organizations
    set plan = p_plan_name,
        subscription_status = 'active',
        plan_expires_at = p_expires_at,
        customer_id = p_customer_id,
        updated_at = v_now
    where id = p_organization_id;
  end if;

  insert into public.plan_usage (user_id, plan, cycle_start, cycle_end, updated_at)
  values (p_user_id::text, lower(p_plan_name), v_now, p_expires_at, v_now)
  on conflict (user_id) do update
  set plan = excluded.plan,
      cycle_start = excluded.cycle_start,
      cycle_end = excluded.cycle_end,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.activate_plan(uuid, uuid, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_plan(uuid, uuid, text, timestamptz, text, text)
  to service_role;
