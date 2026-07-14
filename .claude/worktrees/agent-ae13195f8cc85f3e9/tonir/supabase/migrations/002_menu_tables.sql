-- ============================================================
-- Migration 002: Menu tables
-- Depends on: 001_extend_tables.sql (set_updated_at function)
-- ============================================================


-- ── menu_categories ───────────────────────────────────────────────────────────
-- One venue has many categories (Appetizers, Mains, Drinks, Desserts, etc.)
CREATE TABLE IF NOT EXISTS menu_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    text        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS menu_categories_updated_at ON menu_categories;
CREATE TRIGGER menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── menu_items ────────────────────────────────────────────────────────────────
-- One category has many items (dishes, drinks, etc.)
-- venue_id is denormalised here for convenience — lets us fetch all items
-- for a venue in a single query without joining categories.
CREATE TABLE IF NOT EXISTS menu_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id     text        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  category_id  uuid        NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,                          -- nullable: not every item needs one
  price        integer     NOT NULL,          -- in AMD (Armenian Dram), whole numbers
  photo_url    text,                          -- nullable: add later via admin panel
  is_available boolean     NOT NULL DEFAULT true,
  is_popular   boolean     NOT NULL DEFAULT false,  -- highlight badge in UI
  allergens    text[]      NOT NULL DEFAULT '{}',   -- e.g. ['gluten','nuts','dairy']
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS menu_items_updated_at ON menu_items;
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
