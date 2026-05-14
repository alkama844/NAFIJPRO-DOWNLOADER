package cookies

import (
	"database/sql"
	"fmt"
	"time"
)

type CookiePriority struct {
	db *sql.DB
}

type CookieData struct {
	ID         string
	Value      string
	Name       string
	Visibility string // "public" or "private"
	Enabled    bool
	ExpiresAt  *time.Time
	Platform   string // "youtube", "facebook", "instagram", etc.
}

type CookieResolutionResult struct {
	Cookie *CookieData
	Source string // "user", "admin", "none"
}

func NewCookiePriority(db *sql.DB) *CookiePriority {
	return &CookiePriority{db: db}
}

// ResolveCookie implements the priority logic:
// 1. Check user cookie (from browser/request)
// 2. Check admin cookie (from database)
// 3. Return nil if both missing
// Also validates public/private access rules
func (cp *CookiePriority) ResolveCookie(
	userCookie string,
	platform string,
	isAuthenticatedWithAPIKey bool,
) (*CookieResolutionResult, error) {
	// Step 1: Check user cookie from browser
	if userCookie != "" {
		return &CookieResolutionResult{
			Cookie: &CookieData{
				Value:      userCookie,
				Platform:   platform,
				Visibility: "public",
			},
			Source: "user",
		}, nil
	}

	// Step 2: Check admin cookie from database
	// Only use if enabled and not expired
	adminCookie, err := cp.getAdminCookie(platform, isAuthenticatedWithAPIKey)
	if err != nil {
		return nil, err
	}

	if adminCookie != nil {
		// Validate access rules
		if adminCookie.Visibility == "private" && !isAuthenticatedWithAPIKey {
			return nil, fmt.Errorf("private cookie requires API key authentication")
		}

		return &CookieResolutionResult{
			Cookie: adminCookie,
			Source: "admin",
		}, nil
	}

	// Step 3: Fallback - no cookie available
	return &CookieResolutionResult{
		Cookie: nil,
		Source: "none",
	}, nil
}

// getAdminCookie retrieves the best available admin cookie from database
func (cp *CookiePriority) getAdminCookie(platform string, isAuthenticatedWithAPIKey bool) (*CookieData, error) {
	query := `
		SELECT id, name, value, visibility, enabled, expire_at, platform
		FROM admin_cookies
		WHERE deleted_at IS NULL
		AND enabled = true
		AND (expire_at IS NULL OR expire_at > NOW())
		AND platform = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var cookie CookieData
	err := cp.db.QueryRow(query, platform).Scan(
		&cookie.ID,
		&cookie.Name,
		&cookie.Value,
		&cookie.Visibility,
		&cookie.Enabled,
		&cookie.ExpiresAt,
		&cookie.Platform,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Verify access rules
	if cookie.Visibility == "private" && !isAuthenticatedWithAPIKey {
		return nil, nil
	}

	return &cookie, nil
}

// GetAllPlatformCookies returns all available cookies by platform
func (cp *CookiePriority) GetAllPlatformCookies() (map[string][]*CookieData, error) {
	query := `
		SELECT id, name, value, visibility, enabled, expire_at, platform
		FROM admin_cookies
		WHERE deleted_at IS NULL
		AND enabled = true
		AND (expire_at IS NULL OR expire_at > NOW())
		ORDER BY platform, created_at DESC
	`

	rows, err := cp.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	platformCookies := make(map[string][]*CookieData)
	for rows.Next() {
		var cookie CookieData
		err := rows.Scan(
			&cookie.ID,
			&cookie.Name,
			&cookie.Value,
			&cookie.Visibility,
			&cookie.Enabled,
			&cookie.ExpiresAt,
			&cookie.Platform,
		)
		if err != nil {
			continue
		}

		platformCookies[cookie.Platform] = append(platformCookies[cookie.Platform], &cookie)
	}

	return platformCookies, nil
}

// LogCookieUsage updates last_used_at timestamp for a cookie
func (cp *CookiePriority) LogCookieUsage(cookieID string) error {
	_, err := cp.db.Exec(`
		UPDATE admin_cookies SET last_used_at = NOW()
		WHERE id = $1
	`, cookieID)
	return err
}
