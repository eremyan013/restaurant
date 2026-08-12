ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notif_booking_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_reminders       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_review_prompt   boolean NOT NULL DEFAULT true;
