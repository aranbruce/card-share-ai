-- Secret returned once when a message is created; required to PATCH that row.
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS edit_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_card_contributions_edit_token ON card_contributions(edit_token)
  WHERE edit_token IS NOT NULL;
