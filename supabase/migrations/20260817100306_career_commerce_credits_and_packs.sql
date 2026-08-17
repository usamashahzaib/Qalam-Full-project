alter table public.career_addon_orders
  drop constraint if exists career_addon_orders_amount_pkr_check;
alter table public.career_addon_orders
  add constraint career_addon_orders_amount_pkr_check check (amount_pkr >= 0);

alter table public.career_addon_orders
  add column if not exists product_key text,
  add column if not exists parent_order_id uuid references public.career_addon_orders(id) on delete cascade,
  add column if not exists source_type text not null default 'purchase',
  add column if not exists source_reference text,
  add column if not exists eligible_addons text[] not null default '{}',
  add column if not exists expires_at timestamptz;

update public.career_addon_orders
set product_key = addon_key
where product_key is null;

alter table public.career_addon_orders
  alter column product_key set not null;

alter table public.career_addon_orders
  drop constraint if exists career_addon_orders_source_type_check;
alter table public.career_addon_orders
  add constraint career_addon_orders_source_type_check
  check (source_type in ('purchase', 'bundle_credit', 'plan_credit'));

create unique index if not exists career_addon_source_reference_idx
  on public.career_addon_orders (user_id, source_type, source_reference);

create index if not exists career_addon_parent_idx
  on public.career_addon_orders (parent_order_id)
  where parent_order_id is not null;

drop function if exists public.claim_career_addon_credit(uuid, text);
create function public.claim_career_addon_credit(
  p_user_id uuid,
  p_addon_key text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_source_key text;
  v_cost integer := case p_addon_key
    when 'recruiter_review' then 2
    when 'linkedin_rewrite' then 3
    when 'career_blueprint' then 4
    else 1
  end;
  v_debit integer;
begin
  if p_addon_key not in ('extra_resume', 'cover_letter', 'interview_pack', 'recruiter_review', 'linkedin_rewrite', 'career_blueprint') then
    return null;
  end if;

  select id, addon_key
  into v_order_id, v_source_key
  from public.career_addon_orders
  where user_id = p_user_id
    and status in ('paid', 'partially_consumed', 'fulfilled')
    and (expires_at is null or expires_at > now())
    and (
      (addon_key = p_addon_key and credits_consumed < quantity)
      or (
        addon_key = 'career_credit'
        and eligible_addons @> array[p_addon_key]
        and quantity - credits_consumed >= v_cost
      )
    )
  order by case when addon_key = p_addon_key then 0 else 1 end, expires_at nulls last, created_at
  for update skip locked
  limit 1;

  if v_order_id is null then return null; end if;
  v_debit := case when v_source_key = 'career_credit' then v_cost else 1 end;

  update public.career_addon_orders
  set credits_consumed = credits_consumed + v_debit,
      consumed_at = case when credits_consumed + v_debit >= quantity then now() else null end,
      status = case when credits_consumed + v_debit >= quantity then 'consumed' else 'partially_consumed' end,
      updated_at = now()
  where id = v_order_id;

  return v_order_id;
end;
$$;

drop function if exists public.release_career_addon_credit(uuid, uuid, text);
create function public.release_career_addon_credit(
  p_user_id uuid,
  p_order_id uuid,
  p_addon_key text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source_key text;
  v_cost integer;
  v_released boolean;
begin
  select addon_key into v_source_key
  from public.career_addon_orders
  where id = p_order_id and user_id = p_user_id
  for update;

  if v_source_key is null then return false; end if;
  v_cost := case when v_source_key = 'career_credit' then
    case p_addon_key
      when 'recruiter_review' then 2
      when 'linkedin_rewrite' then 3
      when 'career_blueprint' then 4
      else 1
    end
  else 1 end;

  update public.career_addon_orders
  set credits_consumed = credits_consumed - v_cost,
      consumed_at = null,
      status = case when credits_consumed - v_cost = 0 then 'paid' else 'partially_consumed' end,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and status in ('partially_consumed', 'consumed')
    and credits_consumed >= v_cost
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

revoke all on function public.claim_career_addon_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.release_career_addon_credit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_career_addon_credit(uuid, text) to service_role;
grant execute on function public.release_career_addon_credit(uuid, uuid, text) to service_role;

create or replace function public.fulfill_career_purchase(
  p_order_id uuid,
  p_provider_reference text,
  p_credit_keys text[] default '{}'
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.career_addon_orders%rowtype;
begin
  select * into v_order
  from public.career_addon_orders
  where id = p_order_id
  for update;

  if v_order.id is null then return false; end if;
  if exists (
    select 1 from unnest(p_credit_keys) credit_key
    where credit_key not in ('extra_resume', 'cover_letter', 'interview_pack', 'recruiter_review', 'linkedin_rewrite', 'career_blueprint')
  ) then
    raise exception 'invalid career credit manifest';
  end if;

  if v_order.status = 'pending' then
    update public.career_addon_orders
    set status = 'paid',
        payment_provider = 'lemonsqueezy',
        provider_reference = p_provider_reference,
        updated_at = now()
    where id = p_order_id;
  elsif v_order.status <> 'paid' then
    return false;
  end if;

  insert into public.career_addon_orders (
    workspace_id,
    user_id,
    addon_key,
    product_key,
    amount_pkr,
    quantity,
    status,
    payment_provider,
    provider_reference,
    parent_order_id,
    source_type,
    source_reference
  )
  select
    v_order.workspace_id,
    v_order.user_id,
    credit_key,
    credit_key,
    0,
    v_order.quantity,
    'paid',
    'lemonsqueezy',
    p_provider_reference,
    v_order.id,
    'bundle_credit',
    p_provider_reference || ':' || credit_key
  from unnest(p_credit_keys) credit_key
  on conflict (user_id, source_type, source_reference) do nothing;

  return true;
end;
$$;

create or replace function public.refund_career_purchase(p_order_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.career_addon_orders
  set status = 'refunded', updated_at = now()
  where id = p_order_id or parent_order_id = p_order_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.fulfill_career_purchase(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.refund_career_purchase(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_career_purchase(uuid, text, text[]) to service_role;
grant execute on function public.refund_career_purchase(uuid) to service_role;

insert into public.career_addon_orders (
  workspace_id,
  user_id,
  addon_key,
  product_key,
  amount_pkr,
  quantity,
  credits_consumed,
  status,
  source_type,
  source_reference,
  eligible_addons,
  expires_at
)
select
  membership.workspace_id,
  users.id,
  'career_credit',
  lower(users.plan) || '_plan_credit',
  0,
  case
    when users.plan = 'Solo' and users.billing_cycle = 'annual' then 4
    when users.plan = 'Solo' then 1
    when users.plan = 'Pro' and users.billing_cycle = 'annual' then 12
    when users.plan = 'Pro' and users.billing_cycle = 'quarterly' then 3
    when users.plan = 'Pro' then 1
    else 0
  end,
  0,
  'paid',
  'plan_credit',
  'commerce-launch:' || users.id::text || ':' || coalesce(users.plan_started_at::text, current_date::text),
  array['extra_resume', 'cover_letter', 'interview_pack', 'recruiter_review', 'linkedin_rewrite', 'career_blueprint'],
  users.plan_expires_at
from public.users
join lateral (
  select workspace_id
  from public.workspace_members
  where user_id = users.id
  order by created_at
  limit 1
) membership on true
where users.plan in ('Solo', 'Pro')
on conflict (user_id, source_type, source_reference) do nothing;
