-- Add structured profile fields to voice_profiles for the new voice training UI
ALTER TABLE voice_profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_tone TEXT,
  ADD COLUMN IF NOT EXISTS goals TEXT,
  ADD COLUMN IF NOT EXISTS example_posts TEXT,
  ADD COLUMN IF NOT EXISTS characteristics JSONB DEFAULT '{}';
