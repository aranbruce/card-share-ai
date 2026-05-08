-- Cards table for storing virtual greeting cards
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL, -- birthday, thank_you, congratulations, holiday, custom
  recipient_name TEXT,
  recipient_email TEXT,
  sender_name TEXT,
  copy_headline TEXT NOT NULL,
  copy_message TEXT NOT NULL,
  copy_signoff TEXT NOT NULL,
  image_url TEXT NOT NULL,
  contributor_link_id TEXT UNIQUE,
  contributor_link_expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cards
CREATE POLICY "Users can view own cards" ON cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cards" ON cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards FOR DELETE USING (auth.uid() = user_id);

-- Public link access is served via trusted server routes, not direct anon-key queries.

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_contributor_link_id ON cards(contributor_link_id);
