-- Card contributions table for group messages
CREATE TABLE IF NOT EXISTS card_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  message TEXT,
  giphy_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT card_contributions_message_or_gif_required
    CHECK (
      NULLIF(BTRIM(message), '') IS NOT NULL
      OR NULLIF(BTRIM(giphy_url), '') IS NOT NULL
    )
);

-- Enable RLS
ALTER TABLE card_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contributions
CREATE POLICY "Card owners can view contributions" ON card_contributions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
);

CREATE POLICY "Card owners can add contributions" ON card_contributions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
);

-- Card owners can delete contributions
CREATE POLICY "Card owners can delete contributions" ON card_contributions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM cards 
    WHERE cards.id = card_contributions.card_id 
    AND cards.user_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contributions_card_id ON card_contributions(card_id);
