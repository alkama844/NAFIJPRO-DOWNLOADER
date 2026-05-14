-- Admin Cookies table with platform and visibility support
CREATE TABLE IF NOT EXISTS admin_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'youtube', -- youtube, facebook, instagram, tiktok, etc.
  visibility VARCHAR(20) NOT NULL DEFAULT 'public', -- 'public' or 'private'
  tier VARCHAR(50) DEFAULT 'normal', -- 'premium' or 'normal'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expire_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_preview VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rate_limit_per_minute INT DEFAULT 60,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expire_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Download Statistics table
CREATE TABLE IF NOT EXISTS download_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL, -- youtube, facebook, instagram, tiktok, etc.
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
  url TEXT,
  error_message TEXT,
  cookie_source VARCHAR(20), -- 'user', 'admin', 'none'
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_agent VARCHAR(500),
  ip_address VARCHAR(50),
  duration_ms INT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform Statistics table
CREATE TABLE IF NOT EXISTS platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) UNIQUE NOT NULL,
  total_downloads INT DEFAULT 0,
  successful_downloads INT DEFAULT 0,
  failed_downloads INT DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0.0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- API Key Usage Tracking
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  request_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(api_key_id, endpoint)
);

-- Failed Downloads Log for debugging
CREATE TABLE IF NOT EXISTS failed_downloads_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  platform VARCHAR(50),
  error_message TEXT,
  error_code VARCHAR(50),
  stack_trace TEXT,
  cookie_attempted BOOLEAN,
  cookie_source VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_cookies_platform ON admin_cookies(platform);
CREATE INDEX IF NOT EXISTS idx_admin_cookies_deleted ON admin_cookies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_admin_cookies_enabled ON admin_cookies(enabled, expire_at);
CREATE INDEX IF NOT EXISTS idx_download_stats_platform ON download_stats(platform);
CREATE INDEX IF NOT EXISTS idx_download_stats_created ON download_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_download_stats_status ON download_stats(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_deleted ON api_keys(deleted_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_failed_downloads_platform ON failed_downloads_log(platform);
CREATE INDEX IF NOT EXISTS idx_failed_downloads_created ON failed_downloads_log(created_at);

-- Insert default platforms for platform_stats
INSERT INTO platform_stats (platform) VALUES ('youtube'), ('facebook'), ('instagram'), ('tiktok'), ('twitter'), ('pixiv'), ('threads')
ON CONFLICT DO NOTHING;
