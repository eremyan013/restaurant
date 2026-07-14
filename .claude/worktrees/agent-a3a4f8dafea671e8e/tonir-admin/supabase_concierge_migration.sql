-- ── Concierge Inbox Migration ─────────────────────────────────────────────────
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS concierge_sessions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'escalated', 'resolved')),
  started_at       timestamptz DEFAULT now(),
  last_message_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS concierge_sessions_user_id_idx       ON concierge_sessions(user_id);
CREATE INDEX IF NOT EXISTS concierge_sessions_status_idx        ON concierge_sessions(status);
CREATE INDEX IF NOT EXISTS concierge_sessions_last_message_idx  ON concierge_sessions(last_message_at DESC);

CREATE TABLE IF NOT EXISTS concierge_messages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  uuid        NOT NULL REFERENCES concierge_sessions(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  text        text        NOT NULL,
  suggestions jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS concierge_messages_session_id_idx ON concierge_messages(session_id);

-- RLS: users can read/manage their own sessions and messages
ALTER TABLE concierge_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sessions" ON concierge_sessions;
CREATE POLICY "Users read own sessions" ON concierge_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sessions" ON concierge_sessions;
CREATE POLICY "Users insert own sessions" ON concierge_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sessions" ON concierge_sessions;
CREATE POLICY "Users update own sessions" ON concierge_sessions
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE concierge_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own messages" ON concierge_messages;
CREATE POLICY "Users read own messages" ON concierge_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM concierge_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
