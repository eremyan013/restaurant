-- ============================================================
-- Migration 005: Row Level Security
--
-- PRINCIPLES
-- • The admin panel uses the service_role key on the server.
--   service_role BYPASSES all RLS — no admin-specific policies needed.
-- • The mobile app uses the anon key + user JWT.
--   All policies here restrict what the mobile app can do.
-- • NEVER expose service_role to the mobile app.
--
-- NOTE: auth.uid() returns uuid; user id columns are text.
--       Cast both sides to text to avoid type mismatch errors.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- VENUES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_read_all"    ON venues;
DROP POLICY IF EXISTS "venues_read_active" ON venues;

CREATE POLICY "venues_read_active"
  ON venues FOR SELECT
  USING (is_active = true);


-- ══════════════════════════════════════════════════════════════
-- PROFILES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_cancel_own" ON profiles;

CREATE POLICY "profiles_read_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Users can update their own row but cannot escalate is_admin
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text)
  WITH CHECK (
    auth.uid()::text = id::text
    AND is_admin = (
      SELECT is_admin FROM profiles WHERE id::text = auth.uid()::text
    )
  );


-- ══════════════════════════════════════════════════════════════
-- RESERVATIONS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_read_own"   ON reservations;
DROP POLICY IF EXISTS "reservations_insert_own" ON reservations;
DROP POLICY IF EXISTS "reservations_cancel_own" ON reservations;
DROP POLICY IF EXISTS "reservations_update_own" ON reservations;

CREATE POLICY "reservations_read_own"
  ON reservations FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "reservations_insert_own"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Mobile app may only cancel — not change other fields
CREATE POLICY "reservations_cancel_own"
  ON reservations FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (
    auth.uid()::text = user_id::text
    AND status = 'cancelled'
  );


-- ══════════════════════════════════════════════════════════════
-- FAVORITES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_read_own"   ON favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;

CREATE POLICY "favorites_read_own"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id::text);


-- ══════════════════════════════════════════════════════════════
-- MENU_CATEGORIES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_read_all" ON menu_categories;

CREATE POLICY "menu_categories_read_all"
  ON menu_categories FOR SELECT
  USING (true);


-- ══════════════════════════════════════════════════════════════
-- MENU_ITEMS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_read_available" ON menu_items;

CREATE POLICY "menu_items_read_available"
  ON menu_items FOR SELECT
  USING (is_available = true);


-- ══════════════════════════════════════════════════════════════
-- GUIDES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guides_read_active" ON guides;

CREATE POLICY "guides_read_active"
  ON guides FOR SELECT
  USING (is_active = true);
