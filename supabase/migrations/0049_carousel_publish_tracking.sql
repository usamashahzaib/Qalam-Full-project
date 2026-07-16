-- ----------------------------------------------------------------
-- Track LinkedIn document-post publish state directly on carousels.
--
-- Carousel projects have no linked posts row (the "carousels" table stands
-- alone), so publish_logs (post_id NOT NULL) cannot record a document-post
-- publish attempt. These columns are the audit trail for
-- app/api/carousel/[id]/publish/route.ts instead.
-- ----------------------------------------------------------------

ALTER TABLE public.carousels
  ADD COLUMN IF NOT EXISTS linkedin_post_urn TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
