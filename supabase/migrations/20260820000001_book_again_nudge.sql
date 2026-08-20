ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS book_again_nudge_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: prevent the cron from nudging the entire history on first run
UPDATE reservations
  SET book_again_nudge_sent = TRUE
  WHERE status = 'visited';
