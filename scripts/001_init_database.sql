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
  image_prompt TEXT,
  status TEXT DEFAULT 'draft',
  contributor_link_id TEXT UNIQUE,
  contributor_link_expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards" ON cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cards" ON cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public can view cards with contributor link" ON cards FOR SELECT USING (contributor_link_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_contributor_link_id ON cards(contributor_link_id);

-- Create card contributions table
CREATE TABLE IF NOT EXISTS card_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE card_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contributions" ON card_contributions FOR SELECT USING (true);
CREATE POLICY "Anyone can add contributions" ON card_contributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Card owners can delete contributions" ON card_contributions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM cards 
    WHERE cards.id = card_contributions.card_id 
    AND cards.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_contributions_card_id ON card_contributions(card_id);
