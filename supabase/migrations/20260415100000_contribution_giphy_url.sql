-- Allow optional Giphy GIF attachment per contribution.
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS giphy_url TEXT;
