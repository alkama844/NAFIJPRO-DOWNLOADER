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

	// Check rate limit
	var count int
	err = v.db.QueryRow(`
		SELECT COUNT(*) FROM api_key_usage
		WHERE key_id = $1 AND requested_at > NOW() - INTERVAL '1 minute'
	`, keyID).Scan(&count)

	if err != nil {
		return false, "rate limit check failed"
	}

	if count >= rateLimit {
		return false, "rate limit exceeded"
	}

	// Log usage
	_, _ = v.db.Exec(`
		INSERT INTO api_key_usage (key_id, endpoint, status_code)
		VALUES ($1, $2, $3)
	`, keyID, r.URL.Path, http.StatusOK)

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
