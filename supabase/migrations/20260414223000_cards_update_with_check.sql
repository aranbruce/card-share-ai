-- Ensure card ownership cannot be changed during UPDATE operations.
DROP POLICY IF EXISTS "Users can update own cards" ON cards;

CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
