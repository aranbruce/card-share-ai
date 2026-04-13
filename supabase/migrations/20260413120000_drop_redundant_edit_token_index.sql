-- Replaces duplicate partial index with UNIQUE-only indexing (see 20260411115000).
DROP INDEX IF EXISTS idx_card_contributions_edit_token;
