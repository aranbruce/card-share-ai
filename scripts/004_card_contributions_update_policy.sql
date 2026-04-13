-- Allow updates from the contribute API (validated in route: card link + 24h window)
DROP POLICY IF EXISTS "Anyone can update contributions" ON card_contributions;
CREATE POLICY "Anyone can update contributions" ON card_contributions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
