-- A card's scheduled send: the cron (app/api/cron/send-scheduled) emails the card to
-- the recipient at send_at, and contributors see send_at as the deadline to sign.
--
-- Kept out of `cards` on purpose: owners can update their own cards rows directly, so a
-- schedule there would let anyone queue unlimited emails to any address. Only the service
-- role writes here, after the schedule route's ownership check and rate limit.
CREATE TABLE IF NOT EXISTS card_send_schedules (
  card_id         UUID PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  send_at         TIMESTAMPTZ NOT NULL,
  recipient_email TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (state IN ('scheduled', 'sent', 'failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  -- Set while a cron run is delivering it, so overlapping runs don't send twice
  claimed_at      TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE card_send_schedules ENABLE ROW LEVEL SECURITY;

-- Owners can see their own schedules; there are no write policies.
CREATE POLICY "Owners can read their card send schedules" ON card_send_schedules
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- The cron's lookup of due sends
CREATE INDEX ON card_send_schedules (send_at) WHERE state = 'scheduled';
