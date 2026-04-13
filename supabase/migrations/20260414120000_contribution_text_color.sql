-- Optional hex text color for canvas notes (#RRGGBB), null = theme default
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS text_color TEXT;
