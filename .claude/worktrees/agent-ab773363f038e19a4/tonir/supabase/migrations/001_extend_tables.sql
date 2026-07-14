-- ============================================================
-- Migration 001: Extend existing tables
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times — uses IF NOT EXISTS / OR REPLACE
-- ============================================================

-- ── Reusable trigger function ─────────────────────────────────────────────────
-- Automatically stamps updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── venues ────────────────────────────────────────────────────────────────────
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS is_active   boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Back-fill updated_at for existing rows
UPDATE venues SET updated_at = created_at WHERE updated_at = now() AND created_at IS NOT NULL;

DROP TRIGGER IF EXISTS venues_updated_at ON venues;
CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

UPDATE profiles SET updated_at = created_at WHERE updated_at = now() AND created_at IS NOT NULL;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── reservations ──────────────────────────────────────────────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS admin_note  text,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

UPDATE reservations SET updated_at = created_at WHERE updated_at = now() AND created_at IS NOT NULL;

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
