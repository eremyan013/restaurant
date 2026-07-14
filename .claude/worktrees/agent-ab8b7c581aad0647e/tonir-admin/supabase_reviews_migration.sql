-- ── Reviews Migration ────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Safe to run on both new and existing databases.

-- Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS reviews (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id       text        NOT NULL REFERENCES venues(id)   ON DELETE CASCADE,
  reservation_id uuid        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  rating         smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at     timestamptz DEFAULT now()
);

-- If the table already existed without the status column, add it
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden'));

CREATE INDEX IF NOT EXISTS reviews_venue_id_idx  ON reviews(venue_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx   ON reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_status_idx    ON reviews(status);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reviews
DROP POLICY IF EXISTS "Users insert own reviews" ON reviews;
CREATE POLICY "Users insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own reviews
DROP POLICY IF EXISTS "Users read own reviews" ON reviews;
CREATE POLICY "Users read own reviews" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

-- Public can read approved reviews (for venue detail pages)
DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
CREATE POLICY "Public read approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');
