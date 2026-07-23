-- ----------------------------------------------------------------
-- Agency Phase 1: basic per-workspace branding color. Full white-label
-- (custom domain, branded email, PDF export) is out of scope for now -
-- this is a single accent color an agency can set per client workspace,
-- applied to primary buttons, active nav items, and usage bars while
-- that workspace is active.
-- ----------------------------------------------------------------

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS branding_color TEXT;

ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_branding_color_format;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_branding_color_format
  CHECK (branding_color IS NULL OR branding_color ~ '^#[0-9A-Fa-f]{6}$');
