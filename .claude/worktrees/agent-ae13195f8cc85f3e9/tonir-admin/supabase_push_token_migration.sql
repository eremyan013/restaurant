-- ── Push Token Migration ──────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

-- 1. Add push_token column to profiles (stores Expo push token)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text;

-- 2. Index for fast lookups when broadcasting
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles (push_token)
  WHERE push_token IS NOT NULL;
