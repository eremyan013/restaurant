-- Migration: sla_alert_sent_at — 2026-08-10
-- Tracks when the last SLA breach alert email was sent for a pending_confirmation reservation.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS sla_alert_sent_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_sla_alert
  ON reservations (sla_deadline ASC, sla_alert_sent_at ASC)
  WHERE status = 'pending_confirmation';
