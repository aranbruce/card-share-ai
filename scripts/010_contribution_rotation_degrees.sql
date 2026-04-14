-- Persist slight note rotation on the message canvas.
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS rotation_degrees INTEGER;
