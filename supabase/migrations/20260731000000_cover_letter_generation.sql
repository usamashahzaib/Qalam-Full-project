-- Cover letter generation, matched to a pasted job description.
-- Mirrors resume_documents and the extra_resume credit pattern in
-- 20260729065959_harden_identity_publishing_career_usage.sql, but for the
-- cover_letter add-on: no plan quota, purely a paid-credit unlock.

create table if not exists public.cover_letter_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.career_addon_orders(id) on delete restrict,
  title text not null,
  target_role text not null default '',
  target_company text not null default '',
  hiring_manager text not null default '',
  job_description text not null default '',
  content text not null default '',
  status text not null default 'ready' check (status in ('ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cover_letter_documents_workspace_updated_idx
  on public.cover_letter_documents (workspace_id, updated_at desc);

alter table public.cover_letter_documents enable row level security;
revoke all on public.cover_letter_documents from anon, authenticated;
grant select, insert, update, delete on public.cover_letter_documents to service_role;

-- Credit claiming is centralized in 20260803000000_software_only_career_addons.sql.
