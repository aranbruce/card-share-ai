-- Replace the expression-based unique index with a plain unique constraint so that
-- ON CONFLICT (platform, platform_user_id, platform_team_id) can target it reliably.
-- Empty string is used as the sentinel for "no team" to keep the column NOT NULL.

UPDATE chat_platform_identities SET platform_team_id = '' WHERE platform_team_id IS NULL;
ALTER TABLE chat_platform_identities ALTER COLUMN platform_team_id SET NOT NULL;
ALTER TABLE chat_platform_identities ALTER COLUMN platform_team_id SET DEFAULT '';

UPDATE chat_link_tokens SET platform_team_id = '' WHERE platform_team_id IS NULL;
ALTER TABLE chat_link_tokens ALTER COLUMN platform_team_id SET NOT NULL;
ALTER TABLE chat_link_tokens ALTER COLUMN platform_team_id SET DEFAULT '';

DROP INDEX chat_platform_identities_unique;
ALTER TABLE chat_platform_identities
  ADD CONSTRAINT chat_platform_identities_unique
  UNIQUE (platform, platform_user_id, platform_team_id);
