-- Drop the copy_signoff column from the cards table
ALTER TABLE cards DROP COLUMN IF EXISTS copy_signoff;
