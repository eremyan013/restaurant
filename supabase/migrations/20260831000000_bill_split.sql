-- bill_splits: one row per visited reservation that has been split
CREATE TABLE IF NOT EXISTS bill_splits (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id    UUID          NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  initiator_id      UUID          NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  total_amount      NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  participant_count INTEGER       NOT NULL CHECK (participant_count >= 2),
  share_amount      NUMERIC(10,2) NOT NULL,
  currency          TEXT          NOT NULL DEFAULT 'AMD',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bill_splits_reservation_idx ON bill_splits (reservation_id);
CREATE INDEX IF NOT EXISTS bill_splits_initiator_idx   ON bill_splits (initiator_id);

-- bill_split_participants: one row per person in a split (including the initiator)
CREATE TABLE IF NOT EXISTS bill_split_participants (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id     UUID    NOT NULL REFERENCES bill_splits(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  is_initiator BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bill_split_participants_unique UNIQUE (split_id, user_id)
);

CREATE INDEX IF NOT EXISTS bsp_split_idx ON bill_split_participants (split_id);
CREATE INDEX IF NOT EXISTS bsp_user_idx  ON bill_split_participants (user_id);

-- RLS: users can only see splits they participate in
ALTER TABLE bill_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY bill_splits_select ON bill_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bill_split_participants p
      WHERE p.split_id = bill_splits.id
        AND p.user_id = auth.uid()
    )
  );

ALTER TABLE bill_split_participants ENABLE ROW LEVEL SECURITY;

-- Self-join trick: can see all participants for any split you belong to
CREATE POLICY bsp_select ON bill_split_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bill_split_participants self
      WHERE self.split_id = bill_split_participants.split_id
        AND self.user_id = auth.uid()
    )
  );
