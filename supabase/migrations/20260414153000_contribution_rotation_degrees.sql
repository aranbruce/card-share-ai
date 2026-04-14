-- Persist slight message tilt for creator + contributor canvas notes.
ALTER TABLE card_contributions
  ADD COLUMN IF NOT EXISTS rotation_degrees INTEGER;
