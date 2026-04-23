-- The message column was supposed to be made nullable in 20260415 but the
-- remote DB still enforces NOT NULL. Drop it so creator contributions can
-- start empty.
ALTER TABLE card_contributions
  ALTER COLUMN message DROP NOT NULL;
