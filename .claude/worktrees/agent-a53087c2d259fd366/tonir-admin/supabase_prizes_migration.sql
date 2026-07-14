-- ── Prizes & User Prizes Migration ───────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS prizes (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text        NOT NULL,
  description  text,
  type         text        NOT NULL CHECK (type IN ('discount', 'free_item', 'experience', 'voucher')),
  unlock_type  text        NOT NULL CHECK (unlock_type IN ('points', 'tier')),
  points_cost  integer,            -- used when unlock_type = 'points'
  min_tier_level integer,          -- used when unlock_type = 'tier'
  venue_id     text,               -- null = valid at all venues
  image_url    text,
  stock        integer,            -- null = unlimited
  is_active    boolean     DEFAULT true,
  sort_order   integer     DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_prizes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prize_id   uuid        NOT NULL REFERENCES prizes(id)   ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  code       text        UNIQUE,
  claimed_at timestamptz DEFAULT now(),
  used_at    timestamptz,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_prizes_user_id_idx  ON user_prizes(user_id);
CREATE INDEX IF NOT EXISTS user_prizes_prize_id_idx ON user_prizes(prize_id);
CREATE INDEX IF NOT EXISTS user_prizes_status_idx   ON user_prizes(status);
