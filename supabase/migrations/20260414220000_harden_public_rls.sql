-- Tighten public access: only card owners (auth uid match) may query/write rows
-- directly with the anon key. Public link-based access is served by trusted
-- route handlers using service-role credentials.

-- cards
DROP POLICY IF EXISTS "Public can view cards with contributor link" ON cards;

-- card_contributions
DROP POLICY IF EXISTS "Anyone can view contributions" ON card_contributions;
DROP POLICY IF EXISTS "Anyone can add contributions" ON card_contributions;
DROP POLICY IF EXISTS "Anyone can update contributions" ON card_contributions;

CREATE POLICY "Card owners can view contributions" ON card_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      WHERE cards.id = card_contributions.card_id
        AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Card owners can add contributions" ON card_contributions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards
      WHERE cards.id = card_contributions.card_id
        AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Card owners can update contributions" ON card_contributions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      WHERE cards.id = card_contributions.card_id
        AND cards.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cards
      WHERE cards.id = card_contributions.card_id
        AND cards.user_id = auth.uid()
    )
  );
