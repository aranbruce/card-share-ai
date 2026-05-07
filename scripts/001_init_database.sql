-- Create cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  sender_name TEXT,
  copy_headline TEXT NOT NULL,
  copy_message TEXT NOT NULL,
  copy_signoff TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_prompt TEXT, -- dropped by migration 20260507220000_drop_image_prompt
  contributor_link_id TEXT UNIQUE,
  contributor_link_expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cards" ON cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_contributor_link_id ON cards(contributor_link_id);

-- Create card contributions table
CREATE TABLE IF NOT EXISTS card_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  message TEXT,
  is_creator BOOLEAN NOT NULL DEFAULT false,
  giphy_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT message_or_gif_required
    CHECK (
      NULLIF(BTRIM(message), '') IS NOT NULL
      OR NULLIF(BTRIM(giphy_url), '') IS NOT NULL
    )
);

ALTER TABLE card_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card owners can view contributions" ON card_contributions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
);
CREATE POLICY "Card owners can add contributions" ON card_contributions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
);
CREATE POLICY "Card owners can delete contributions" ON card_contributions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM cards 
    WHERE cards.id = card_contributions.card_id 
    AND cards.user_id = auth.uid()
  )
);
CREATE POLICY "Card owners can update contributions" ON card_contributions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM cards
    WHERE cards.id = card_contributions.card_id
    AND cards.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_contributions_card_id ON card_contributions(card_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_contributions_one_creator_per_card
  ON card_contributions (card_id)
  WHERE is_creator = true;
