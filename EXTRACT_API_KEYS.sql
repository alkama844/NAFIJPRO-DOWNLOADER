-- Copy-paste this entire SQL into Supabase SQL Editor and execute

-- API Keys Table for /api/v1/extract
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  rate_limit_per_minute INTEGER DEFAULT 60,
  expire_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_enabled ON api_keys(enabled);

-- Usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS api_key_usage (
  id BIGSERIAL PRIMARY KEY,
  key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_time ON api_key_usage(requested_at);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin only can see all keys
CREATE POLICY "Admin can manage keys" ON api_keys
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policy: Anyone can see their own key usage
CREATE POLICY "Users can see usage" ON api_key_usage
  FOR SELECT USING (TRUE);
