-- waitlist_entries: one row per user per venue (toggle via delete+insert)
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id     TEXT        NOT NULL REFERENCES venues(id)  ON DELETE CASCADE,
  desired_date DATE        NULL,
  notified_at  TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_entries_user_venue_unique UNIQUE (user_id, venue_id)
);

CREATE INDEX IF NOT EXISTS waitlist_venue_idx ON waitlist_entries (venue_id, created_at);
CREATE INDEX IF NOT EXISTS waitlist_user_idx  ON waitlist_entries (user_id);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_select_own ON waitlist_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY waitlist_insert_own ON waitlist_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY waitlist_delete_own ON waitlist_entries
  FOR DELETE USING (auth.uid() = user_id);
