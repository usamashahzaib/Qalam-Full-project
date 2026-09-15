-- Opt-in monthly proof report email per client workspace. Off by default so
-- an agency decides which clients receive their numbers automatically.
alter table public.workspaces
  add column if not exists monthly_proof_enabled boolean not null default false;
