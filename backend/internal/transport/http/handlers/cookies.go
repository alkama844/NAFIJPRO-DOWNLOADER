package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type CookieHandler struct {
	db *sql.DB
}

func NewCookieHandler(db *sql.DB) *CookieHandler {
	return &CookieHandler{db: db}
}

type CookieResponse struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Value     string     `json:"value,omitempty"` // Never send full value to frontend
	Preview   string     `json:"preview"`         // First 20 chars + ...
	Tier      string     `json:"tier"`            // "premium" or "normal"
	Enabled   bool       `json:"enabled"`
	CreatedAt time.Time  `json:"createdAt"`
	LastUsed  *time.Time `json:"lastUsed,omitempty"`
	ExpiresAt *time.Time `json:"expiresAt,omitempty"`
}

// ListCookies returns all cookies with their tier status
func (h *CookieHandler) ListCookies(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	rows, err := h.db.Query(`
		SELECT id, name, SUBSTR(value, 1, 20), tier, enabled, created_at, last_used_at, expire_at
		FROM admin_cookies
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
	`)

	if err != nil {
		fmt.Printf("Failed to fetch cookies: %v\n", err)
		InternalError(w, "Failed to fetch cookies")
		return
	}
	defer rows.Close()

	var cookies []CookieResponse
	for rows.Next() {
		var id, name, preview, tier string
		var enabled bool
		var createdAt sql.NullTime
		var lastUsed, expiresAt sql.NullTime

		if err := rows.Scan(&id, &name, &preview, &tier, &enabled, &createdAt, &lastUsed, &expiresAt); err != nil {
			continue
		}

		cookie := CookieResponse{
			ID:        id,
			Name:      name,
			Preview:   preview + "...",
			Tier:      tier, // "premium" or "normal"
			Enabled:   enabled,
			CreatedAt: createdAt.Time,
		}

		if lastUsed.Valid {
			cookie.LastUsed = &lastUsed.Time
		}

		if expiresAt.Valid {
			cookie.ExpiresAt = &expiresAt.Time
		}

		cookies = append(cookies, cookie)
	}

	if cookies == nil {
		cookies = []CookieResponse{}
	}

	SuccessResponse(w, cookies)
}

// CreateCookie adds a new cookie with tier support
func (h *CookieHandler) CreateCookie(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	var req struct {
		Name      string     `json:"name"`
		Value     string     `json:"value"`
		Tier      string     `json:"tier"` // "premium" or "normal"
		ExpiresAt *time.Time `json:"expiresAt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		BadRequest(w, "Invalid request body")
		return
	}

	if req.Name == "" || req.Value == "" {
		BadRequest(w, "Name and value are required")
		return
	}

	// Validate tier
	if req.Tier != "premium" && req.Tier != "normal" {
		req.Tier = "normal" // Default to normal
	}

	preview := req.Value
	if len(preview) > 20 {
		preview = preview[:20]
	}

	var cookieID string
	err := h.db.QueryRow(`
		INSERT INTO admin_cookies (name, value, tier, enabled, expire_at)
		VALUES ($1, $2, $3, true, $4)
		RETURNING id
	`, req.Name, req.Value, req.Tier, req.ExpiresAt).Scan(&cookieID)

	if err != nil {
		fmt.Printf("Failed to create cookie: %v\n", err)
		InternalError(w, "Failed to create cookie")
		return
	}

	resp := CookieResponse{
		ID:        cookieID,
		Name:      req.Name,
		Preview:   preview + "...",
		Tier:      req.Tier,
		Enabled:   true,
		CreatedAt: time.Now(),
		ExpiresAt: req.ExpiresAt,
	}

	CreatedResponse(w, resp)
}

// DeleteCookie removes a cookie
func (h *CookieHandler) DeleteCookie(w http.ResponseWriter, r *http.Request) {
	if h.db == nil {
		InternalError(w, "Database not initialized")
		return
	}

	cookieID := r.URL.Query().Get("id")
	if cookieID == "" {
		BadRequest(w, "Cookie ID required")
		return
	}

	result, err := h.db.Exec(`
		UPDATE admin_cookies SET deleted_at = NOW() WHERE id = $1
	`, cookieID)

	if err != nil {
		fmt.Printf("Failed to delete cookie: %v\n", err)
		InternalError(w, "Failed to delete cookie")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		NotFound(w, "Cookie not found")
		return
	}

	SuccessResponse(w, map[string]string{"message": "Cookie deleted successfully"})
}
