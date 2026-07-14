-- ── Venue Hours & Blocked Dates Migration ────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

-- Opening hours per day of week (0=Sunday … 6=Saturday)
CREATE TABLE IF NOT EXISTS venue_hours (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id     text    NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      boolean NOT NULL DEFAULT true,
  open_time    text,   -- e.g. '10:00'  (null = all day / not set)
  close_time   text,   -- e.g. '23:00'
  UNIQUE (venue_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS venue_hours_venue_id_idx ON venue_hours(venue_id);

-- Specific dates where a venue is closed (holidays, private events, etc.)
CREATE TABLE IF NOT EXISTS venue_blocked_dates (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id   text        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date       text        NOT NULL,  -- ISO date: 'YYYY-MM-DD'
  reason     text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (venue_id, date)
);

CREATE INDEX IF NOT EXISTS venue_blocked_dates_venue_id_idx ON venue_blocked_dates(venue_id);

-- RLS: anyone authenticated (or public) can read; only service role can write
ALTER TABLE venue_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read venue hours" ON venue_hours;
CREATE POLICY "Public read venue hours" ON venue_hours
  FOR SELECT USING (true);

ALTER TABLE venue_blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read venue blocked dates" ON venue_blocked_dates;
CREATE POLICY "Public read venue blocked dates" ON venue_blocked_dates
  FOR SELECT USING (true);
