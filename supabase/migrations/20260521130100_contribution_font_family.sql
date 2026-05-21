-- Per-note font family preset slug (see lib/message-font-presets.ts)
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS font_family TEXT;
