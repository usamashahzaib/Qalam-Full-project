-- Software-only career add-ons. Paid units become atomic in-app credits.

alter table public.career_addon_orders
  drop constraint if exists career_addon_orders_status_check;
alter table public.career_addon_orders
  add constraint career_addon_orders_status_check
  check (status in ('pending', 'paid', 'partially_consumed', 'consumed', 'fulfilled', 'cancelled', 'refunded'));

create index if not exists career_addon_available_credit_idx
  on public.career_addon_orders (user_id, addon_key, created_at)
  where status in ('paid', 'partially_consumed', 'fulfilled')
    and credits_consumed < quantity;

create or replace function public.claim_career_addon_credit(
  p_user_id uuid,
  p_addon_key text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_quantity integer;
  v_consumed integer;
begin
  if p_addon_key not in ('extra_resume', 'cover_letter', 'interview_pack', 'recruiter_review', 'linkedin_rewrite', 'career_blueprint') then
    return null;
  end if;

  select id, quantity, credits_consumed
  into v_order_id, v_quantity, v_consumed
  from public.career_addon_orders
  where user_id = p_user_id
    and addon_key = p_addon_key
    and status in ('paid', 'partially_consumed', 'fulfilled')
    and credits_consumed < quantity
  order by created_at
  for update skip locked
  limit 1;

  if v_order_id is null then return null; end if;

  update public.career_addon_orders
  set credits_consumed = credits_consumed + 1,
      consumed_at = case when credits_consumed + 1 >= quantity then now() else null end,
      status = case when credits_consumed + 1 >= quantity then 'consumed' else 'partially_consumed' end,
      updated_at = now()
  where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.release_career_addon_credit(
  p_user_id uuid,
  p_order_id uuid,
  p_addon_key text
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_released boolean;
begin
  update public.career_addon_orders
  set credits_consumed = credits_consumed - 1,
      consumed_at = null,
      status = case when credits_consumed - 1 = 0 then 'paid' else 'partially_consumed' end,
      updated_at = now()
  where id = p_order_id
    and user_id = p_user_id
    and addon_key = p_addon_key
    and status in ('partially_consumed', 'consumed')
    and credits_consumed > 0
  returning true into v_released;

  return coalesce(v_released, false);
end;
$$;

revoke all on function public.claim_career_addon_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.release_career_addon_credit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_career_addon_credit(uuid, text) to service_role;
grant execute on function public.release_career_addon_credit(uuid, uuid, text) to service_role;

create table if not exists public.career_addon_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.career_addon_orders(id) on delete restrict,
  addon_key text not null check (addon_key in ('interview_pack', 'recruiter_review', 'linkedin_rewrite', 'career_blueprint')),
  title text not null,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_addon_artifacts_workspace_idx
  on public.career_addon_artifacts (workspace_id, addon_key, updated_at desc);

alter table public.career_addon_artifacts enable row level security;
revoke all on public.career_addon_artifacts from anon, authenticated;
grant select, insert, update, delete on public.career_addon_artifacts to service_role;
