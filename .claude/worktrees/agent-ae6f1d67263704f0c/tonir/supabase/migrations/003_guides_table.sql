-- ============================================================
-- Migration 003: Guides table
-- Moves GUIDES out of the hardcoded data.ts into the database
-- so the admin panel can create/edit/reorder/deactivate guides.
-- Depends on: 001_extend_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS guides (
  -- Keep text IDs matching the existing hardcoded IDs ('top50', 'wine', etc.)
  -- so the mobile app can migrate gradually without breaking deep-links.
  id          text        PRIMARY KEY,
  title       text        NOT NULL,
  subtitle    text        NOT NULL,
  count       integer     NOT NULL DEFAULT 0,   -- "12 bars" shown on card
  cover_url   text        NOT NULL,
  tag         text        NOT NULL,              -- chip label: 'Seasonal', 'Route', etc.
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  -- Optional: link a guide to specific venue IDs so admin can manage membership
  venue_ids   text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS guides_updated_at ON guides;
CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
