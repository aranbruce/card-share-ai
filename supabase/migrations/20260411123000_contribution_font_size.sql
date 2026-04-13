-- Persist contributor / creator note font size (see scripts/007_contribution_font_size.sql)
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS font_size INTEGER;
