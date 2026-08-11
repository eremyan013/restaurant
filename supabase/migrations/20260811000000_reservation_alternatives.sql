-- Migration: reservation_alternatives — 2026-08-11
-- Stores alternative time slots offered to users when original slot is unavailable.

CREATE TABLE IF NOT EXISTS public.reservation_alternatives (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  date           text        NOT NULL,
  date_iso       date        NOT NULL,
  time           text        NOT NULL,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_alternatives_reservation_id
  ON reservation_alternatives (reservation_id);

ALTER TABLE reservation_alternatives ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read alternatives for their own reservations
CREATE POLICY "users_view_own_alternatives"
  ON reservation_alternatives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE reservations.id = reservation_id
        AND reservations.user_id = auth.uid()
    )
  );

-- Allow authenticated users to cancel their own reservations
-- (used by decline-all in the alternatives flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reservations' AND policyname = 'users_can_cancel_own'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users_can_cancel_own"
        ON reservations FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (status = 'cancelled')
    $p$;
  END IF;
END $$;
