-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- Fixes: "Could not find the 'edit_token' column of 'card_contributions' in the schema cache"

-- 1) Column + unique index (from 005_contribution_edit_token.sql)
ALTER TABLE card_contributions ADD COLUMN IF NOT EXISTS edit_token TEXT UNIQUE;

-- 2) RLS so PATCH works (from 004_card_contributions_update_policy.sql)
DROP POLICY IF EXISTS "Anyone can update contributions" ON card_contributions;
DROP POLICY IF EXISTS "Card owners can update contributions" ON card_contributions;
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
