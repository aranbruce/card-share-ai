-- Tables used by @chat-adapter/state-pg (Vercel Chat SDK) for Slack bot state:
-- locks (incl. token), cache, lists, queues, subscriptions.
-- The adapter creates them at runtime via CREATE TABLE IF NOT EXISTS without RLS,
-- which triggers Supabase linter errors (public schema + PostgREST).
--
-- These rows must never be readable/writable via the Supabase Data API
-- (anon / authenticated). Server-side pg (POSTGRES_URL) connects as a role
-- that bypasses RLS (e.g. postgres), so the bot keeps working.
--
-- DDL kept in sync with @chat-adapter/state-pg ensureSchema().

CREATE TABLE IF NOT EXISTS chat_state_subscriptions (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, thread_id)
);

CREATE TABLE IF NOT EXISTS chat_state_locks (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, thread_id)
);

CREATE TABLE IF NOT EXISTS chat_state_cache (
  key_prefix text NOT NULL,
  cache_key text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_prefix, cache_key)
);

CREATE TABLE IF NOT EXISTS chat_state_lists (
  key_prefix text NOT NULL,
  list_key text NOT NULL,
  seq bigserial NOT NULL,
  value text NOT NULL,
  expires_at timestamptz,
  PRIMARY KEY (key_prefix, list_key, seq)
);

CREATE TABLE IF NOT EXISTS chat_state_queues (
  key_prefix text NOT NULL,
  thread_id text NOT NULL,
  seq bigserial NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_prefix, thread_id, seq)
);

CREATE INDEX IF NOT EXISTS chat_state_locks_expires_idx
  ON chat_state_locks (expires_at);

CREATE INDEX IF NOT EXISTS chat_state_cache_expires_idx
  ON chat_state_cache (expires_at);

CREATE INDEX IF NOT EXISTS chat_state_lists_expires_idx
  ON chat_state_lists (expires_at);

CREATE INDEX IF NOT EXISTS chat_state_queues_expires_idx
  ON chat_state_queues (expires_at);

ALTER TABLE chat_state_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_state_queues ENABLE ROW LEVEL SECURITY;
