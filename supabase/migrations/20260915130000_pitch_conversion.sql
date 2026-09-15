-- A won pitch becomes a client workspace once. converted_at is claimed before
-- the workspace is created so a double click cannot create two clients.
alter table public.pitch_previews
  add column if not exists converted_at timestamptz,
  add column if not exists converted_workspace_id uuid references public.workspaces(id) on delete set null;
