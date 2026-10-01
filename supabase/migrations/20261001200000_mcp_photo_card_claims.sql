-- Makes each photo-first card link from the MCP card view single-use: the
-- first upload claims the link's nonce and records the card it creates, so a
-- replayed picker or a retried upload returns that card instead of a new one.
CREATE TABLE IF NOT EXISTS mcp_photo_card_claims (
  nonce      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- NULL while the card is still being generated
  card_id    UUID REFERENCES cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No policies: only the service role, which bypasses RLS, reads or writes it.
ALTER TABLE mcp_photo_card_claims ENABLE ROW LEVEL SECURITY;

-- Supports cleanup of claims older than the 30-minute link lifetime
CREATE INDEX ON mcp_photo_card_claims (created_at);
