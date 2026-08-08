-- Migration: call_center_flow — 2026-08-08
-- Adds call-center reservation statuses, SLA tracking columns, and tightens RLS.

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'cancelled',
    'visited',
    'completed',
    'pending_confirmation',
    'rejected',
    'alternative_offered'
  ));

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS confirmed_at     timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS rejected_at      timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text         NULL,
  ADD COLUMN IF NOT EXISTS sla_deadline     timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS agent_id         uuid         NULL
    REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_sla_queue
  ON reservations (sla_deadline ASC)
  WHERE status = 'pending_confirmation';

CREATE INDEX IF NOT EXISTS idx_reservations_agent
  ON reservations (agent_id)
  WHERE agent_id IS NOT NULL;

DROP POLICY IF EXISTS "guests can view own reservation by token" ON reservations;

CREATE POLICY "users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "staff can view all reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'staff', 'super_admin')
    )
  );
