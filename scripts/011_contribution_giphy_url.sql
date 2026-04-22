-- Allow optional Giphy GIF attachment per contribution.
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS giphy_url TEXT;

-- Enforce at the DB level that every row has a message, a GIF, or both.
ALTER TABLE card_contributions
  DROP CONSTRAINT IF EXISTS message_or_gif_required,
  ADD CONSTRAINT message_or_gif_required
    CHECK (message <> '' OR giphy_url IS NOT NULL);
