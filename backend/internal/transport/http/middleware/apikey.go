package middleware

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// APIKeyValidator validates API keys
type APIKeyValidator struct {
	db *sql.DB
}

// NewAPIKeyValidator creates a new validator
func NewAPIKeyValidator(db *sql.DB) *APIKeyValidator {
	return &APIKeyValidator{db: db}
}

// ValidateKey checks if API key is valid and rate limit not exceeded
func (v *APIKeyValidator) ValidateKey(r *http.Request) (bool, string) {
	// Get key from header
	key := r.Header.Get("X-API-Key")
	if key == "" {
		return false, "missing X-API-Key header"
	}

	// Hash the key
	hash := sha256.Sum256([]byte(key))
	keyHash := hex.EncodeToString(hash[:])

	// Check if key exists and is enabled
	var keyID string
	var rateLimit int
	var expireAt *time.Time

	err := v.db.QueryRow(`
		SELECT id, rate_limit_per_minute, expire_at
		FROM api_keys
		WHERE key_hash = $1 AND enabled = TRUE AND deleted_at IS NULL
	`, keyHash).Scan(&keyID, &rateLimit, &expireAt)

	if err != nil {
		return false, "invalid API key"
	}

	// Check expiration
	if expireAt != nil && time.Now().After(*expireAt) {
		return false, "API key expired"
	}

	// Check rate limit using api_key_usage (sum of request_count in last minute)
	var recentCount int
	err = v.db.QueryRow(`
		SELECT COALESCE(SUM(request_count),0) FROM api_key_usage
		WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '1 minute'
	`, keyID).Scan(&recentCount)

	if err != nil {
		return false, "rate limit check failed"
	}

	if recentCount >= rateLimit {
		return false, "rate limit exceeded"
	}

	// Log usage: upsert per (api_key_id, endpoint)
	_, _ = v.db.Exec(`
		INSERT INTO api_key_usage (api_key_id, endpoint, request_count, created_at)
		VALUES ($1, $2, 1, NOW())
		ON CONFLICT (api_key_id, endpoint) DO UPDATE SET request_count = api_key_usage.request_count + 1, created_at = NOW()
	`, keyID, r.URL.Path)

	// Update last_used_at
	_, _ = v.db.Exec(`
		UPDATE api_keys SET last_used_at = NOW() WHERE id = $1
	`, keyID)

	return true, ""
}

// APIKeyMiddleware checks API key before processing request
func APIKeyMiddleware(validator *APIKeyValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only check /api/v1/extract endpoint
			if !strings.HasPrefix(r.URL.Path, "/api/v1/extract") {
				next.ServeHTTP(w, r)
				return
			}

			valid, msg := validator.ValidateKey(r)
			if !valid {
				http.Error(w, fmt.Sprintf("Unauthorized: %s", msg), http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
