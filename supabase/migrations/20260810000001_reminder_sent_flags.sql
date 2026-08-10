-- Migration: reminder_sent_flags — 2026-08-10
-- Gate columns preventing double-fire of pre-dining push reminders.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_day_before_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent         boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reservations_reminders
  ON reservations (date_iso, reminder_day_before_sent, reminder_2h_sent)
  WHERE status = 'confirmed';
