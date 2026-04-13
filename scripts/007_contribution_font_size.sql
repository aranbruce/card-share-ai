-- Persist contributor font size preference
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS font_size INTEGER;