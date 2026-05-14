package handlers

import (
	"encoding/json"
	"net/http"
)

// Response standardizes all API responses
type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// WriteJSON writes JSON response with proper headers
func writeJSON(w http.ResponseWriter, statusCode int, resp Response) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(resp)
}

// SuccessResponse returns a 200 OK response with data
func SuccessResponse(w http.ResponseWriter, data interface{}) {
	writeJSON(w, http.StatusOK, Response{Success: true, Data: data})
}

// CreatedResponse returns a 201 Created response with data
func CreatedResponse(w http.ResponseWriter, data interface{}) {
	writeJSON(w, http.StatusCreated, Response{Success: true, Data: data})
}

// ErrorResponse returns an error response with appropriate status code
func ErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, Response{Success: false, Error: message})
}

// BadRequest returns 400 error
func BadRequest(w http.ResponseWriter, message string) {
	ErrorResponse(w, http.StatusBadRequest, message)
}

// Unauthorized returns 401 error
func Unauthorized(w http.ResponseWriter, message string) {
	ErrorResponse(w, http.StatusUnauthorized, message)
}

// InternalError returns 500 error
func InternalError(w http.ResponseWriter, message string) {
	ErrorResponse(w, http.StatusInternalServerError, message)
}

// NotFound returns 404 error
func NotFound(w http.ResponseWriter, message string) {
	ErrorResponse(w, http.StatusNotFound, message)
}
