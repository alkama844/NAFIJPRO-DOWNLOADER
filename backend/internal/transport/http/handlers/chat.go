package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// ChatHandler handles AI chat requests with Groq
type ChatHandler struct{}

// NewChatHandler creates a new chat handler
func NewChatHandler() *ChatHandler {
	return &ChatHandler{}
}

// ChatRequest represents incoming chat request
type ChatRequest struct {
	Message string `json:"message"`
}

// ChatResponse represents chat response
type ChatResponse struct {
	Success  bool   `json:"success"`
	Text     string `json:"text"`
	Provider string `json:"provider"`
	Model    string `json:"model"`
	Error    string `json:"error,omitempty"`
}

// Chat handles chat requests with Groq API
func (h *ChatHandler) Chat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "Message is required", http.StatusBadRequest)
		return
	}

	// Get Groq API key from environment
	groqAPIKey := os.Getenv("GROQ_API_KEY")
	if groqAPIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "GROQ_API_KEY not configured",
		})
		return
	}

	// Hardcoded Groq settings
	groqURL := "https://api.groq.com/openai/v1/chat/completions"
	model := "llama-3.1-70b-versatile"

	// Prepare request to Groq
	groqReq := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": req.Message,
			},
		},
		"temperature": 0.7,
		"max_tokens":  1024,
	}

	reqBody, err := json.Marshal(groqReq)
	if err != nil {
		http.Error(w, "Failed to prepare request", http.StatusInternalServerError)
		return
	}

	// Make request to Groq
	httpReq, err := http.NewRequest("POST", groqURL, bytes.NewBuffer(reqBody))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	httpReq.Header.Set("Authorization", "Bearer "+groqAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to reach Groq API: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	// Parse Groq response
	var groqResp map[string]interface{}
	if err := json.Unmarshal(body, &groqResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to parse Groq response",
		})
		return
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   fmt.Sprintf("Groq API error: %s", body),
		})
		return
	}

	// Extract message from response
	choices, ok := groqResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Invalid response from Groq",
		})
		return
	}

	choice := choices[0].(map[string]interface{})
	message := choice["message"].(map[string]interface{})
	text := message["content"].(string)

	// Return response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Success:  true,
		Text:     text,
		Provider: "groq",
		Model:    model,
	})
}
