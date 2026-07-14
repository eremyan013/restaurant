-- ── Admin Activity Log Migration ─────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     text,
  admin_name   text,
  action       text        NOT NULL,
  entity_type  text,
  entity_id    text,
  entity_name  text,
  details      jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_log_admin_id_idx   ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS admin_activity_log_entity_idx     ON admin_activity_log(entity_type, entity_id);

-- Admins write via service role (no RLS needed for service-role inserts)
-- No user-facing read access needed
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
-- (No SELECT policy = only service role can read, which is what we want)
