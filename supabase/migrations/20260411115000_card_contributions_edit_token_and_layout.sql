-- Secret returned once when a message is created; required to PATCH that row.
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS edit_token TEXT UNIQUE;

-- Persist contributor message layout (canvas position + size + page)
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS position_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS position_y DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS width_percent DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS page_index INTEGER;
