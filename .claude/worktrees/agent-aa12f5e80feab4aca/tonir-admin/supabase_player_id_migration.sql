-- ── Player ID Migration ───────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

-- 1. Create sequence starting at 1000
CREATE SEQUENCE IF NOT EXISTS player_id_seq START WITH 1000;

-- 2. Add player_id column (nullable first so backfill works)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS player_id integer UNIQUE;

-- 3. Backfill existing profiles
UPDATE profiles
SET player_id = nextval('player_id_seq')
WHERE player_id IS NULL;

-- 4. Set default + NOT NULL
ALTER TABLE profiles
  ALTER COLUMN player_id SET DEFAULT nextval('player_id_seq'),
  ALTER COLUMN player_id SET NOT NULL;

-- 5. Trigger: auto-assign player_id on every new profile insert
CREATE OR REPLACE FUNCTION assign_player_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.player_id IS NULL THEN
    NEW.player_id := nextval('player_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_player_id ON profiles;
CREATE TRIGGER trigger_assign_player_id
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_player_id();

-- 6. RPC function used by the mobile app to resolve email from player_id
--    (needed for "Login with ID" feature)
CREATE OR REPLACE FUNCTION get_email_by_player_id(p_id integer)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email FROM profiles WHERE player_id = p_id AND role = 'user' LIMIT 1;
$$;
