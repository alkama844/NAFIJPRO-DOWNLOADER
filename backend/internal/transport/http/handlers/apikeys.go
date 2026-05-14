package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type APIKeyHandler struct {
	db *sql.DB
}

func NewAPIKeyHandler(db *sql.DB) *APIKeyHandler {
	return &APIKeyHandler{db: db}
}

type APIKeyResponse struct {
	ID        string         `json:"id"`
	Key       string         `json:"key,omitempty"` // Only on create/regenerate
	Preview   string         `json:"key"`           // Display-only preview
	Name      string         `json:"name"`
	Enabled   bool           `json:"enabled"`
	RateLimit int            `json:"rateLimit"`
	CreatedAt time.Time      `json:"createdAt"`
	LastUsed  *time.Time     `json:"lastUsed,omitempty"`
	ExpiresAt *time.Time     `json:"expiresAt,omitempty"`
	Stats     map[string]int `json:"stats,omitempty"`
}

// CreateAPIKey creates new API key with proper error handling
func (h *APIKeyHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	var req struct {
		Name         string `json:"name"`
		RateLimit    int    `json:"rateLimit"`
		ValidityDays *int   `json:"validityDays"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		BadRequest(w, "Invalid request body")
		return
	}

	if req.Name == "" {
		BadRequest(w, "Name is required")
		return
	}

	rateLimit := req.RateLimit
	if rateLimit == 0 {
		rateLimit = 60
	}

	key := generateAPIKey()
	keyHash := hashAPIKey(key)
	keyPreview := key[:8] + "..." + key[len(key)-4:]

	var expireAt *time.Time
	if req.ValidityDays != nil && *req.ValidityDays > 0 {
		exp := time.Now().AddDate(0, 0, *req.ValidityDays)
		expireAt = &exp
	}

	var keyID string
	err := h.db.QueryRow(`
		INSERT INTO api_keys (key_hash, key_preview, name, rate_limit_per_minute, expire_at, enabled)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id
	`, keyHash, keyPreview, req.Name, rateLimit, expireAt).Scan(&keyID)

	if err != nil {
		fmt.Printf("Failed to create API key: %v\n", err)
		InternalError(w, "Failed to create API key")
		return
	}

	resp := APIKeyResponse{
		ID:        keyID,
		Key:       key,
		Preview:   keyPreview,
		Name:      req.Name,
		Enabled:   true,
		RateLimit: rateLimit,
		CreatedAt: time.Now(),
		ExpiresAt: expireAt,
	}

	CreatedResponse(w, resp)
}

// ListAPIKeys lists all API keys with error handling
func (h *APIKeyHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	rows, err := h.db.Query(`
		SELECT id, key_preview, name, enabled, rate_limit_per_minute, last_used_at, created_at, expire_at
		FROM api_keys
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
	`)

	if err != nil {
		fmt.Printf("Failed to fetch API keys: %v\n", err)
		InternalError(w, "Failed to fetch API keys")
		return
	}
	defer rows.Close()

	var keys []APIKeyResponse
	for rows.Next() {
		var id, preview, name string
		var enabled bool
		var rateLimit int
		var lastUsed, createdAt sql.NullTime
		var expireAt sql.NullTime

		if err := rows.Scan(&id, &preview, &name, &enabled, &rateLimit, &lastUsed, &createdAt, &expireAt); err != nil {
			continue
		}

		apiKey := APIKeyResponse{
			ID:        id,
			Preview:   preview,
			Name:      name,
			Enabled:   enabled,
			RateLimit: rateLimit,
			CreatedAt: createdAt.Time,
		}

		if lastUsed.Valid {
			apiKey.LastUsed = &lastUsed.Time
		}

		if expireAt.Valid {
			apiKey.ExpiresAt = &expireAt.Time
		}

		keys = append(keys, apiKey)
	}

	if keys == nil {
		keys = []APIKeyResponse{}
	}

	SuccessResponse(w, keys)
}

// DeleteAPIKey deletes an API key with error handling
func (h *APIKeyHandler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	keyID := r.URL.Query().Get("id")
	if keyID == "" {
		BadRequest(w, "Key ID required")
		return
	}

	result, err := h.db.Exec(`
		UPDATE api_keys SET deleted_at = NOW() WHERE id = $1
	`, keyID)

	if err != nil {
		fmt.Printf("Failed to delete API key: %v\n", err)
		InternalError(w, "Failed to delete API key")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		NotFound(w, "API key not found")
		return
	}

	SuccessResponse(w, map[string]string{"message": "Key deleted successfully"})
}

// GetKeyStats gets usage stats for all API keys
func (h *APIKeyHandler) GetKeyStats(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	var totalKeys, activeKeys, totalUsage int

	err := h.db.QueryRow(`
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN enabled = true AND (expire_at IS NULL OR expire_at > NOW()) THEN 1 END) as active
		FROM api_keys
		WHERE deleted_at IS NULL
	`).Scan(&totalKeys, &activeKeys)

	if err != nil {
		fmt.Printf("Failed to fetch API key stats: %v\n", err)
		InternalError(w, "Failed to fetch stats")
		return
	}

	// Try to get total usage, but don't fail if table doesn't exist
	_ = h.db.QueryRow(`SELECT COUNT(*) FROM api_key_usage`).Scan(&totalUsage)

	stats := map[string]interface{}{
		"totalKeys":     totalKeys,
		"activeKeys":    activeKeys,
		"totalRequests": totalUsage,
	}

	SuccessResponse(w, stats)
}

// Helper functions
func generateAPIKey() string {
	b := make([]byte, 32)
	rand.Read(b)
	return "nak_" + hex.EncodeToString(b)
}

func hashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}
