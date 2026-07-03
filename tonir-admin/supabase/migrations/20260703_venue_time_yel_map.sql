ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS time_yel_map jsonb DEFAULT NULL;

COMMENT ON COLUMN venues.time_yel_map IS
  'Maps booking time strings to YEL point amounts. E.g. {"19:00": 100, "21:00": 200}. Absent key or value 0 means no YEL for that slot.';
