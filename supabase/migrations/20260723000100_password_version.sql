-- Migration 0040: Add password_version column for session invalidation on password change.
--
-- When a user changes or resets their password, password_version is incremented.
-- The JWT embeds the version at sign-in time; requireAuthApi compares DB vs JWT
-- and returns 401 if they diverge, immediately expiring all active sessions.
--
-- Safe to run on existing databases: IF NOT EXISTS + DEFAULT 0 means all
-- current rows default to version 0, matching the 0 embedded in existing JWTs.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 0;
