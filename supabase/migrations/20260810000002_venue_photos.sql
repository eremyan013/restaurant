-- Migration: venue_photos — 2026-08-10
-- Adds multi-photo gallery support per venue.

CREATE TABLE IF NOT EXISTS venue_photos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    text        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  url         text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_photos_venue_id
  ON venue_photos (venue_id, sort_order);

ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_photos_public_read"
  ON venue_photos
  FOR SELECT
  USING (true);
