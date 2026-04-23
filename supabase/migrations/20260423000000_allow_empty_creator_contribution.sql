-- Creator contributions may start with an empty message (owner fills it in later).
ALTER TABLE card_contributions
  DROP CONSTRAINT IF EXISTS message_or_gif_required,
  ADD CONSTRAINT message_or_gif_required
    CHECK (
      is_creator = true
      OR (message IS NOT NULL AND btrim(message) <> '')
      OR (giphy_url IS NOT NULL AND btrim(giphy_url) <> '')
    );
