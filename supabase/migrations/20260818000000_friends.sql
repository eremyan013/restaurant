-- 1. New columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_visible       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_friend_activity BOOLEAN NOT NULL DEFAULT true;

-- 2. friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_friend CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_unique_pair    UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id, status);

-- 3. friend_activity_feed table
CREATE TABLE IF NOT EXISTS friend_activity_feed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('review', 'visited')),
  venue_id    TEXT REFERENCES venues(id) ON DELETE SET NULL,
  venue_name  TEXT,
  rating      SMALLINT,
  review_text TEXT,
  visited_at  DATE,
  source_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_actor_created_idx ON friend_activity_feed (actor_id, created_at DESC);

-- 4. Trigger: review approved → feed row
CREATE OR REPLACE FUNCTION trg_review_to_feed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved') THEN
    INSERT INTO friend_activity_feed (actor_id, event_type, venue_id, venue_name, rating, review_text, source_id)
    SELECT NEW.user_id, 'review', NEW.venue_id, v.name, NEW.rating, LEFT(COALESCE(NEW.comment, ''), 200), NEW.id
    FROM venues v WHERE v.id = NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS review_approved_feed_trg ON reviews;
CREATE TRIGGER review_approved_feed_trg
AFTER UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION trg_review_to_feed();

-- 5. Trigger: reservation visited → feed row
CREATE OR REPLACE FUNCTION trg_visited_to_feed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'visited' AND OLD.status <> 'visited') THEN
    INSERT INTO friend_activity_feed (actor_id, event_type, venue_id, venue_name, visited_at, source_id)
    SELECT NEW.user_id, 'visited', NEW.venue_id, v.name,
      CASE WHEN NEW.date_iso IS NOT NULL THEN NEW.date_iso::DATE ELSE NULL END,
      NEW.id
    FROM venues v WHERE v.id = NEW.venue_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservation_visited_feed_trg ON reservations;
CREATE TRIGGER reservation_visited_feed_trg
AFTER UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION trg_visited_to_feed();

-- 6. RLS on friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY friendships_select ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 7. RLS on friend_activity_feed
ALTER TABLE friend_activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY feed_select ON friend_activity_feed
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = actor_id)
          OR
          (f.addressee_id = auth.uid() AND f.requester_id = actor_id)
        )
    )
  );

-- 8. Allow authenticated users to read visible profiles for friend search
-- (Additive policy — existing SELECT policies are ORed together in Supabase)
CREATE POLICY profiles_visible_or_self ON profiles
  FOR SELECT USING (profile_visible = true OR auth.uid() = id);
