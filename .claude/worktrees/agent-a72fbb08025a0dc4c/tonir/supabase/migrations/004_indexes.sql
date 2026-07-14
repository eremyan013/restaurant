-- ============================================================
-- Migration 004: Indexes
-- Covers all FK columns and common query patterns.
-- ============================================================

-- ── venues ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_venues_is_active
  ON venues (is_active);

CREATE INDEX IF NOT EXISTS idx_venues_kind
  ON venues (kind);

CREATE INDEX IF NOT EXISTS idx_venues_heat
  ON venues (heat);

CREATE INDEX IF NOT EXISTS idx_venues_rating
  ON venues (rating DESC);


-- ── menu_categories ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_categories_venue_id
  ON menu_categories (venue_id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_sort
  ON menu_categories (venue_id, sort_order);


-- ── menu_items ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_items_venue_id
  ON menu_items (venue_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id
  ON menu_items (category_id);

-- Fetch available items for a venue, ordered for display
CREATE INDEX IF NOT EXISTS idx_menu_items_venue_available
  ON menu_items (venue_id, is_available, sort_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_popular
  ON menu_items (venue_id, is_popular) WHERE is_popular = true;


-- ── guides ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guides_active_sort
  ON guides (is_active, sort_order) WHERE is_active = true;


-- ── reservations ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON reservations (user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_venue_id
  ON reservations (venue_id);

CREATE INDEX IF NOT EXISTS idx_reservations_status
  ON reservations (status);

-- Admin panel: list all reservations for a venue, most recent first
CREATE INDEX IF NOT EXISTS idx_reservations_venue_created
  ON reservations (venue_id, created_at DESC);


-- ── favorites ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorites_user_id
  ON favorites (user_id);

-- Unique constraint: a user can only favourite a venue once
-- (add only if not already present from initial migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'favorites_user_venue_unique'
  ) THEN
    ALTER TABLE favorites
      ADD CONSTRAINT favorites_user_venue_unique UNIQUE (user_id, venue_id);
  END IF;
END;
$$;


-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON profiles (is_admin) WHERE is_admin = true;
