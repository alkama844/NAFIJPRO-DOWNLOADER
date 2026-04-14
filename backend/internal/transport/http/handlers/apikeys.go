package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"
)

type APIKeyHandler struct {
	db *sql.DB
}

func NewAPIKeyHandler(db *sql.DB) *APIKeyHandler {
	return &APIKeyHandler{db: db}
}

// CreateAPIKey creates new API key
func (h *APIKeyHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name              string `json:"name"`
		RateLimitPerMin   int    `json:"rate_limit_per_minute"`
		ExpireInDays      int    `json:"expire_in_days"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}

	if req.RateLimitPerMin == 0 {
		req.RateLimitPerMin = 60
	}

	// Generate random key
	key := generateAPIKey()
	keyHash := hashAPIKey(key)
	keyPreview := key[:8] + "..." + key[len(key)-4:]

	// Set expiration
	var expireAt *time.Time
	if req.ExpireInDays > 0 {
		exp := time.Now().AddDate(0, 0, req.ExpireInDays)
		expireAt = &exp
	}

	// Insert into database
	var keyID string
	err := h.db.QueryRow(`
		INSERT INTO api_keys (key_hash, key_preview, name, rate_limit_per_minute, expire_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, keyHash, keyPreview, req.Name, req.RateLimitPerMin, expireAt).Scan(&keyID)

	if err != nil {
		http.Error(w, "Failed to create key", http.StatusInternalServerError)
		return
	}

	// Return key (only shown once!)
	resp := map[string]interface{}{
		"id":     keyID,
		"key":    key,
		"preview": keyPreview,
		"name":   req.Name,
		"message": "⚠️  Copy this key now - it won't be shown again!",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ListAPIKeys lists all API keys
func (h *APIKeyHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, key_preview, name, enabled, rate_limit_per_minute, last_used_at, created_at, expire_at
		FROM api_keys
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
	`)

	if err != nil {
		http.Error(w, "Failed to fetch keys", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var keys []map[string]interface{}
	for rows.Next() {
		var id, preview, name string
		var enabled bool
		var rateLimit int
		var lastUsed, createdAt sql.NullTime
		var expireAt sql.NullTime

		if err := rows.Scan(&id, &preview, &name, &enabled, &rateLimit, &lastUsed, &createdAt, &expireAt); err != nil {
			continue
		}

		key := map[string]interface{}{
			"id":                    id,
			"preview":              preview,
			"name":                 name,
			"enabled":              enabled,
			"rate_limit_per_minute": rateLimit,
			"created_at":           createdAt.Time,
		}

		if lastUsed.Valid {
			key["last_used_at"] = lastUsed.Time
		}

		if expireAt.Valid {
			key["expire_at"] = expireAt.Time
			key["expired"] = expireAt.Time.Before(time.Now())
		}

		keys = append(keys, key)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(keys)
}

// DeleteAPIKey deletes an API key
func (h *APIKeyHandler) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	keyID := r.URL.Query().Get("id")
	if keyID == "" {
		http.Error(w, "Key ID required", http.StatusBadRequest)
		return
	}

	_, err := h.db.Exec(`
		UPDATE api_keys SET deleted_at = NOW() WHERE id = $1
	`, keyID)

	if err != nil {
		http.Error(w, "Failed to delete key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Key deleted"})
}

// GetKeyStats gets usage stats for a specific or all keys
func (h *APIKeyHandler) GetKeyStats(w http.ResponseWriter, r *http.Request) {
	keyID := r.URL.Query().Get("id")

	// If no specific key ID, return general stats
	if keyID == "" {
		h.GetGeneralStats(w, r)
		return
	}

	var totalRequests, successRequests, failedRequests int
	var lastUsed sql.NullTime

	err := h.db.QueryRow(`
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success,
			COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed,
			MAX(requested_at) as last_used
		FROM api_key_usage
		WHERE key_id = $1
	`, keyID).Scan(&totalRequests, &successRequests, &failedRequests, &lastUsed)

	if err != nil {
		http.Error(w, "Failed to fetch stats", http.StatusInternalServerError)
		return
	}

	stats := map[string]interface{}{
		"total_requests":   totalRequests,
		"success_requests": successRequests,
		"failed_requests":  failedRequests,
	}

	if lastUsed.Valid {
		stats["last_used"] = lastUsed.Time
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetGeneralStats gets overall stats for all API keys
func (h *APIKeyHandler) GetGeneralStats(w http.ResponseWriter, r *http.Request) {
	var totalKeys, activeKeys, totalUsage int

	// Get total and active keys
	err := h.db.QueryRow(`
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN enabled = true THEN 1 END) as active
		FROM api_keys
		WHERE deleted_at IS NULL
	`).Scan(&totalKeys, &activeKeys)

	if err != nil {
		http.Error(w, "Failed to fetch key stats", http.StatusInternalServerError)
		return
	}

	// Get total usage
	err = h.db.QueryRow(`
		SELECT COUNT(*) as total
		FROM api_key_usage
	`).Scan(&totalUsage)

	if err != nil {
		// If table doesn't exist or is empty, that's OK
		totalUsage = 0
	}

	stats := map[string]interface{}{
		"total_keys":   totalKeys,
		"active_keys":  activeKeys,
		"total_usage":  totalUsage,
		"providers":    make(map[string]interface{}),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
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
