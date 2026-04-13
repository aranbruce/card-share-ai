-- Creator opening message stored as a dedicated contribution row
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS is_creator BOOLEAN NOT NULL DEFAULT false;

-- At most one creator note per card
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_contributions_one_creator_per_card
  ON card_contributions (card_id)
  WHERE is_creator = true;

-- Backfill: one creator row per card that does not already have one
INSERT INTO card_contributions (
  card_id,
  message,
  is_creator,
  page_index
)
SELECT
  c.id,
  c.copy_message,
  true,
  1
FROM cards c
WHERE trim(coalesce(c.copy_message, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM card_contributions cc
    WHERE cc.card_id = c.id
      AND cc.is_creator = true
  );
