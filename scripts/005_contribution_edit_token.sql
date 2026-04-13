-- Secret returned once when a message is created; required to PATCH that row.
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS edit_token TEXT UNIQUE;
