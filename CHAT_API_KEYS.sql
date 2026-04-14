-- CHAT API KEYS TABLE (For AI Chat Endpoints)
-- Paste this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_session_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  provider TEXT CHECK (provider IN ('groq', 'openai')),
  model TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_chat_keys_session ON chat_session_keys(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_keys_hash ON chat_session_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_chat_keys_enabled ON chat_session_keys(enabled);
