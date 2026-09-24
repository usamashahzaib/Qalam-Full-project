-- F2 fix: workspace_usage.ts previously gave every client workspace the same
-- fixed 60-draft / 10-carousel slice of the shared pool with no way to move
-- capacity between clients. A book with one heavy client and four light ones
-- stranded paid-for capacity: the light clients' unused slices could never
-- reach the heavy one, which hit its own wall well under the account total.
--
-- These columns let the agency owner reallocate their pool per client. Null
-- means "use the plan default" (see AGENCY_DEFAULT_WORKSPACE_DRAFT_ALLOWANCE
-- in lib/pricing.ts); a non-null value is that workspace's configured share,
-- validated at write time (see checkPoolAllocation in lib/agency/capacity.ts)
-- to never let the sum across an owner's client workspaces exceed the pool.
alter table public.workspaces
  add column if not exists monthly_draft_allowance integer,
  add column if not exists monthly_carousel_allowance integer;

alter table public.workspaces drop constraint if exists workspaces_monthly_draft_allowance_check;
alter table public.workspaces add constraint workspaces_monthly_draft_allowance_check
  check (monthly_draft_allowance is null or monthly_draft_allowance >= 0);

alter table public.workspaces drop constraint if exists workspaces_monthly_carousel_allowance_check;
alter table public.workspaces add constraint workspaces_monthly_carousel_allowance_check
  check (monthly_carousel_allowance is null or monthly_carousel_allowance >= 0);
