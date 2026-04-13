-- Cards previously used status ('draft' | 'collecting' | 'sent'). sent_at is the
-- replacement signal for "shared with recipient" (contributor copy, analytics).
UPDATE cards
SET sent_at = COALESCE(sent_at, updated_at)
WHERE status = 'sent';

ALTER TABLE cards DROP COLUMN IF EXISTS status;
