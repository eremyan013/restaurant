-- ── Settings table migration ──────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Seed default tier names
INSERT INTO settings (key, value) VALUES
  ('tier_1_name', 'Tonir'),
  ('tier_2_name', 'Pandok'),
  ('tier_3_name', 'Areni'),
  ('tier_4_name', 'Master')
ON CONFLICT (key) DO NOTHING;
