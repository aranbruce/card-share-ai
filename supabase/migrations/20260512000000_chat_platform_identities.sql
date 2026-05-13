CREATE TABLE IF NOT EXISTS chat_platform_identities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_team_id TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, platform_user_id, platform_team_id)
);

ALTER TABLE chat_platform_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON chat_platform_identities
  FOR SELECT USING (supabase_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS chat_link_tokens (
  token            TEXT PRIMARY KEY,
  platform         TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  platform_team_id TEXT NOT NULL DEFAULT '',
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ
);

ALTER TABLE chat_link_tokens ENABLE ROW LEVEL SECURITY;
