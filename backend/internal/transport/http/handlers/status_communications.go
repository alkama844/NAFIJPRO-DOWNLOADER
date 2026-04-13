package handlers

import (
	"net/http"

	"downaria-api/pkg/response"
)

// PlatformStatus represents the status of a platform
type PlatformStatus struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
	Status  string `json:"status"`
}

// StatusResponse represents the API status response
type StatusResponse struct {
	Success          bool               `json:"success"`
	Maintenance      bool               `json:"maintenance"`
	MaintenanceType  string             `json:"maintenanceType"`
	MaintenanceMsg   string             `json:"maintenanceMessage"`
	Platforms        []PlatformStatus   `json:"platforms"`
}

// CommunicationItem represents a communication/announcement
type CommunicationItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Severity  string `json:"severity"`
	Active    bool   `json:"active"`
	StartDate string `json:"startDate,omitempty"`
	EndDate   string `json:"endDate,omitempty"`
}

// CommunicationsResponse represents the communications API response
type CommunicationsResponse struct {
	Success          bool                 `json:"success"`
	Communications   []CommunicationItem  `json:"communications"`
}

// Status handler - GET /api/v1/status
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	platforms := []PlatformStatus{
		{ID: "tiktok", Name: "TikTok", Enabled: true, Status: "active"},
		{ID: "instagram", Name: "Instagram", Enabled: true, Status: "active"},
		{ID: "facebook", Name: "Facebook", Enabled: true, Status: "active"},
		{ID: "twitter", Name: "Twitter", Enabled: true, Status: "active"},
		{ID: "youtube", Name: "YouTube", Enabled: true, Status: "active"},
		{ID: "reddit", Name: "Reddit", Enabled: true, Status: "active"},
		{ID: "pixiv", Name: "Pixiv", Enabled: true, Status: "active"},
		{ID: "threads", Name: "Threads", Enabled: true, Status: "active"},
		{ID: "weibo", Name: "Weibo", Enabled: true, Status: "active"},
	}

	payload := map[string]any{
		"success": true,
		"data": map[string]any{
			"maintenance":        false,
			"maintenanceType":    "off",
			"maintenanceMessage": nil,
			"platforms":          platforms,
		},
	}

	response.WriteSuccessRequest(w, r, http.StatusOK, payload)
}

// Communications handler - GET /api/v1/communications
func (h *Handler) Communications(w http.ResponseWriter, r *http.Request) {
	communications := []CommunicationItem{
		{
			ID:       "welcome",
			Type:     "announcement",
			Title:    "Welcome to DownAria",
			Message:  "Download videos from TikTok, Instagram, Facebook, YouTube, and more",
			Severity: "info",
			Active:   true,
		},
	}

	payload := map[string]any{
		"success":           true,
		"communications":    communications,
	}

	response.WriteSuccessRequest(w, r, http.StatusOK, payload)
}
