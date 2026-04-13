-- Card contributions table for group messages
CREATE TABLE IF NOT EXISTS card_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE card_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contributions
-- Anyone can view contributions (filtered by card access at application level)
CREATE POLICY "Anyone can view contributions" ON card_contributions FOR SELECT USING (true);

-- Anyone can add contributions (validated at API level via contributor_link_id)
CREATE POLICY "Anyone can add contributions" ON card_contributions FOR INSERT WITH CHECK (true);

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
