-- Add extra_pages column to cards table
ALTER TABLE cards ADD COLUMN IF NOT EXISTS extra_pages INTEGER DEFAULT 0;
