package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// ChatHandler handles AI chat requests
type ChatHandler struct{}

// NewChatHandler creates a new chat handler
func NewChatHandler() *ChatHandler {
	return &ChatHandler{}
}

// ImageData represents image data for multimodal models
type ImageData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

// ChatRequest represents incoming chat request
type ChatRequest struct {
	Message    string     `json:"message"`
	Model      string     `json:"model,omitempty"`
	SessionKey string     `json:"sessionKey,omitempty"`
	WebSearch  bool       `json:"webSearch,omitempty"`
	Image      *ImageData `json:"image,omitempty"`
}

// ChatResponse represents chat response
type ChatResponse struct {
	Success    bool   `json:"success"`
	Text       string `json:"text"`
	Provider   string `json:"provider"`
	Model      string `json:"model"`
	SessionKey string `json:"sessionKey,omitempty"`
	Error      string `json:"error,omitempty"`
}

// Chat handles chat requests with multiple AI providers
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

	// Set default model if not provided
	if req.Model == "" {
		req.Model = "groq-llama-3.1-70b"
	}

	// Route to appropriate provider
	if strings.HasPrefix(req.Model, "groq") {
		h.chatGroq(w, req)
	} else if strings.HasPrefix(req.Model, "gemini") {
		h.chatGemini(w, req)
	} else if req.Model == "gpt5" {
		h.chatOpenAI(w, req)
	} else if req.Model == "copilot-smart" {
		h.chatAzure(w, req)
	} else {
		// Fallback to Groq
		h.chatGroq(w, req)
	}
}

// chatGroq handles Groq API requests
func (h *ChatHandler) chatGroq(w http.ResponseWriter, req ChatRequest) {
	groqAPIKey := os.Getenv("GROQ_API_KEY")
	if groqAPIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "GROQ_API_KEY not configured",
		})
		return
	}

	// Determine model
	model := req.Model
	if !strings.HasPrefix(model, "groq-") {
		model = "groq-llama-3.1-70b"
	}
	// Remove "groq-" prefix for API
	apiModel := strings.TrimPrefix(model, "groq-")

	groqReq := map[string]interface{}{
		"model": apiModel,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": req.Message,
			},
		},
		"temperature": 0.7,
		"max_tokens":  1024,
	}

	h.callAPIProvider(w, req, "https://api.groq.com/openai/v1/chat/completions", groqAPIKey, model, "groq", groqReq)
}

// chatGemini handles Google Gemini API requests
func (h *ChatHandler) chatGemini(w http.ResponseWriter, req ChatRequest) {
	geminiAPIKey := os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "GEMINI_API_KEY not configured",
		})
		return
	}

	model := req.Model
	if !strings.HasPrefix(model, "gemini-") {
		model = "gemini-2.5-flash"
	}

	// Gemini uses a different API format, but we'll use the REST API
	// For now, return a placeholder - Gemini requires special handling for multimodal
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Success:  false,
		Provider: "gemini",
		Model:    model,
		Error:    "Gemini integration coming soon - please use Groq for now",
	})
}

// chatOpenAI handles OpenAI GPT requests
func (h *ChatHandler) chatOpenAI(w http.ResponseWriter, req ChatRequest) {
	openaiAPIKey := os.Getenv("OPENAI_API_KEY")
	if openaiAPIKey == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "OPENAI_API_KEY not configured",
		})
		return
	}

	model := "gpt-5"

	openaiReq := map[string]interface{}{
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

	h.callAPIProvider(w, req, "https://api.openai.com/v1/chat/completions", openaiAPIKey, model, "openai", openaiReq)
}

// chatAzure handles Azure Copilot/OpenAI requests
func (h *ChatHandler) chatAzure(w http.ResponseWriter, req ChatRequest) {
	azureKey := os.Getenv("AZURE_OPENAI_KEY")
	azureEndpoint := os.Getenv("AZURE_OPENAI_ENDPOINT")
	if azureKey == "" || azureEndpoint == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT not configured",
		})
		return
	}

	model := "copilot-smart"

	azureReq := map[string]interface{}{
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

	// Azure uses a different URL format
	url := strings.TrimSuffix(azureEndpoint, "/") + "/openai/deployments/" + model + "/chat/completions?api-version=2024-02-15-preview"
	h.callAzureProvider(w, req, url, azureKey, model, azureReq)
}

// callAPIProvider calls an OpenAI-compatible API provider
func (h *ChatHandler) callAPIProvider(w http.ResponseWriter, req ChatRequest, url, apiKey, model, provider string, payload interface{}) {
	reqBody, err := json.Marshal(payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to prepare request",
		})
		return
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to create request",
		})
		return
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: provider,
			Model:    model,
			Error:    fmt.Sprintf("Failed to reach %s API: %v", provider, err),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to read response",
		})
		return
	}

	var apiResp map[string]interface{}
	if err := json.Unmarshal(body, &apiResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: provider,
			Model:    model,
			Error:    "Failed to parse API response",
		})
		return
	}

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: provider,
			Model:    model,
			Error:    fmt.Sprintf("%s API error: %s", provider, body),
		})
		return
	}

	// Extract message from standard OpenAI response format
	choices, ok := apiResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: provider,
			Model:    model,
			Error:    "Invalid response format",
		})
		return
	}

	choice := choices[0].(map[string]interface{})
	message := choice["message"].(map[string]interface{})
	text := message["content"].(string)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Success:    true,
		Text:       text,
		Provider:   provider,
		Model:      model,
		SessionKey: req.SessionKey,
	})
}

// callAzureProvider calls the Azure OpenAI API
func (h *ChatHandler) callAzureProvider(w http.ResponseWriter, req ChatRequest, url, apiKey, model string, payload interface{}) {
	reqBody, err := json.Marshal(payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to prepare request",
		})
		return
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to create request",
		})
		return
	}

	httpReq.Header.Set("api-key", apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: "azure",
			Model:    model,
			Error:    fmt.Sprintf("Failed to reach Azure OpenAI API: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success: false,
			Error:   "Failed to read response",
		})
		return
	}

	var apiResp map[string]interface{}
	if err := json.Unmarshal(body, &apiResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: "azure",
			Model:    model,
			Error:    "Failed to parse Azure response",
		})
		return
	}

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: "azure",
			Model:    model,
			Error:    fmt.Sprintf("Azure API error: %s", body),
		})
		return
	}

	choices, ok := apiResp["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ChatResponse{
			Success:  false,
			Provider: "azure",
			Model:    model,
			Error:    "Invalid response format",
		})
		return
	}

	choice := choices[0].(map[string]interface{})
	message := choice["message"].(map[string]interface{})
	text := message["content"].(string)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ChatResponse{
		Success:    true,
		Text:       text,
		Provider:   "azure",
		Model:      model,
		SessionKey: req.SessionKey,
	})
}
