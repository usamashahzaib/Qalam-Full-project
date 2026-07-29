-- 20260728123016_quarterly_billing.sql widened payments and payment_subscriptions
-- billing_cycle CHECK constraints to allow 'quarterly' and updated activate_plan()
-- to accept and write 'quarterly', but never touched users_billing_cycle_check.
-- Production still rejects 'quarterly' on public.users, so every quarterly
-- checkout fails at activation (both the activate_plan RPC path and its
-- direct-update fallback in lib/server/payments.ts hit the same CHECK).
alter table public.users
  drop constraint if exists users_billing_cycle_check;
alter table public.users
  add constraint users_billing_cycle_check
  check (billing_cycle in ('monthly', 'quarterly', 'annual'));
