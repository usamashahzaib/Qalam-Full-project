-- Per-carousel visual identity. theme_id is assigned at generation time
-- (rotated from a tone-compatible pool) and updated when the user picks a
-- different theme in the editor. design_settings holds branding overrides
-- (author name, designation, accent color, background color) so a deck
-- reopens exactly as it was designed.

alter table public.carousels
  add column if not exists theme_id text,
  add column if not exists design_settings jsonb;
