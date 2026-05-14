# API KEY & COOKIE MANAGEMENT - IMPLEMENTATION GUIDE

## Database Schema

### 1. API Keys Table
```sql
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) NOT NULL UNIQUE,           -- SHA256 hash of the key
    key_preview VARCHAR(20) NOT NULL,                -- First 8 + ... + last 4 chars
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'normal',               -- 'normal' or 'premium'
    rate_limit_per_minute INT DEFAULT 60,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expire_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT valid_tier CHECK (tier IN ('normal', 'premium'))
);

CREATE INDEX idx_api_keys_deleted ON api_keys(deleted_at);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### 2. Cookies Table
```sql
CREATE TABLE IF NOT EXISTS admin_cookies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,                            -- Full cookie value (encrypted in prod)
    tier VARCHAR(20) DEFAULT 'normal',              -- 'normal' or 'premium'
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expire_at TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT valid_tier CHECK (tier IN ('normal', 'premium'))
);

CREATE INDEX idx_cookies_deleted ON admin_cookies(deleted_at);
CREATE INDEX idx_cookies_tier ON admin_cookies(tier);
```

### 3. API Key Usage Tracking Table
```sql
CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES api_keys(id),
    endpoint VARCHAR(255),
    status_code INT,
    requested_at TIMESTAMP DEFAULT NOW(),
    response_time_ms INT,
    
    FOREIGN KEY (key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_key_usage_key ON api_key_usage(key_id);
CREATE INDEX idx_api_key_usage_time ON api_key_usage(requested_at);
```

## Core Business Logic: Premium Tier Validation

### The Rule
**PREMIUM Cookies can ONLY be used by PREMIUM API Keys.**

- Premium API Key can access: PREMIUM cookies + NORMAL cookies (if configured)
- Normal API Key can access: NORMAL cookies ONLY
- Normal API Key tries to access Premium Cookie → **403 FORBIDDEN**

### Implementation in Go Backend

#### 1. Middleware for Key Validation
```go
// internal/transport/http/middleware/api_key_tier.go
package middleware

import (
    "net/http"
    "database/sql"
)

type TierValidator struct {
    db *sql.DB
}

func NewTierValidator(db *sql.DB) *TierValidator {
    return &TierValidator{db: db}
}

// ValidateKeyCanUseCookie ensures API key tier allows cookie access
func (v *TierValidator) ValidateKeyCanUseCookie(keyHash string, cookieID string) error {
    var keyTier, cookieTier string
    
    // Get key tier
    err := v.db.QueryRow(`
        SELECT tier FROM api_keys 
        WHERE key_hash = $1 AND enabled = true AND deleted_at IS NULL
    `, keyHash).Scan(&keyTier)
    if err != nil {
        return fmt.Errorf("invalid API key")
    }
    
    // Get cookie tier
    err = v.db.QueryRow(`
        SELECT tier FROM admin_cookies 
        WHERE id = $1 AND enabled = true AND deleted_at IS NULL
    `, cookieID).Scan(&cookieTier)
    if err != nil {
        return fmt.Errorf("cookie not found")
    }
    
    // Enforce: Premium cookies only for premium keys
    if cookieTier == "premium" && keyTier != "premium" {
        return fmt.Errorf("normal API keys cannot access premium cookies")
    }
    
    return nil
}
```

#### 2. Handler Integration
```go
// When using a cookie, validate tier first
func (h *Handler) UseCookie(w http.ResponseWriter, r *http.Request) {
    apiKey := r.Header.Get("X-API-Key")
    cookieID := r.URL.Query().Get("cookie_id")
    
    // Hash the key to look up tier
    keyHash := hashAPIKey(apiKey)
    
    // Validate tier
    validator := NewTierValidator(h.db)
    if err := validator.ValidateKeyCanUseCookie(keyHash, cookieID); err != nil {
        if err.Error() == "normal API keys cannot access premium cookies" {
            ErrorResponse(w, http.StatusForbidden, "This API key cannot access premium resources")
        } else {
            ErrorResponse(w, http.StatusUnauthorized, err.Error())
        }
        return
    }
    
    // Proceed with request...
}
```

## Frontend Integration

### 1. API Key Creation - Set Tier
```typescript
// useApiKeys.ts
const createKey = useCallback(async (name: string, tier: 'normal' | 'premium' = 'normal') => {
    const result = await mutate('POST', {
        name,
        tier,        // NEW: specify tier when creating
        rateLimit: 60,
    });
    // ...
}, [mutate, refetch]);
```

### 2. Cookie Management - Tier Indicator
```typescript
// In admin dashboard
<div className="flex items-center gap-2">
    <span className="text-sm">{cookie.name}</span>
    <Badge variant={cookie.tier === 'premium' ? 'gold' : 'gray'}>
        {cookie.tier.toUpperCase()}
    </Badge>
</div>
```

### 3. Check Before Using Cookie
```typescript
async function useCookieWithValidation(apiKey: string, cookie: CookieResponse) {
    if (cookie.tier === 'premium') {
        const keyResponse = await fetch(`/api/admin/api-keys/${apiKey}`);
        const keyData = await keyResponse.json();
        
        if (keyData.tier !== 'premium') {
            showError('This API key cannot access premium cookies');
            return false;
        }
    }
    
    // Safe to use
    return true;
}
```

## API Endpoints Summary

### API Keys
- `GET /api/admin/api-keys` - List all keys (with tier shown)
- `POST /api/admin/api-keys` - Create key `{ name, rateLimit, tier?, validityDays? }`
- `DELETE /api/admin/api-keys?id=X` - Delete key
- `POST /api/admin/api-keys` with action param:
  - `{ action: 'update', id, enabled, tier }` - Toggle or change tier
  - `{ action: 'regenerate', id }` - Regenerate key

### Cookies
- `GET /api/admin/cookies` - List all cookies (with tier + preview)
- `POST /api/admin/cookies` - Create cookie `{ name, value, tier, expiresAt? }`
- `DELETE /api/admin/cookies?id=X` - Delete cookie

### Responses (All endpoints)
```json
{
  "success": true,
  "data": { /* ... */ },
  "error": null
}
```

## Error Codes

| Status | Code | Message |
|--------|------|---------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | BadRequest | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | API key tier cannot access this resource |
| 404 | NotFound | Resource not found |
| 500 | InternalError | Database or server error |

## Deployment Checklist

- [ ] Database migrations applied (schema created)
- [ ] API handlers updated with proper error responses
- [ ] Tier validation middleware integrated
- [ ] Frontend updated with safe null checks
- [ ] 401 interceptor configured
- [ ] Vercel Analytics 404 fixed
- [ ] Environment variables configured
- [ ] End-to-end testing completed

