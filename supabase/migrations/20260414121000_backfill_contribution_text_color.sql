-- Set explicit text color for rows created before `text_color` existed (was NULL / theme default).
-- Near-black matches typical body text on the card canvas (#171717 ≈ neutral-900).
UPDATE card_contributions
SET text_color = '#171717'
WHERE text_color IS NULL;
