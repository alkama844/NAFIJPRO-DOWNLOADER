# Backend .env
DATABASE_URL="postgresql://..."
GROQ_API_KEY="gsk_..."

# Frontend .env.local  
NEXT_PUBLIC_API_URL="https://nafijpro-downloader.onrender.com"# COPY-PASTE READY: Backend Integration

## Add to `/backend/cmd/server/main.go`

```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"

	"internal/infra/database"
	"internal/transport/http/handlers"
	"internal/transport/http/middleware"
)

func main() {
	// Load environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	// Connect to database
	db, err := database.Connect(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Create API key handler
	apiKeyHandler := handlers.NewAPIKeyHandler(db)
	apiKeyValidator := middleware.NewAPIKeyValidator(db)

	// Setup router
	router := mux.NewRouter()

	// Apply API key middleware to /api/v1/extract
	router.Use(middleware.APIKeyMiddleware(apiKeyValidator))

	// Register admin endpoints (BEFORE middleware)
	router.HandleFunc("/api/admin/api-keys/create", apiKeyHandler.CreateAPIKey).Methods("POST")
	router.HandleFunc("/api/admin/api-keys", apiKeyHandler.ListAPIKeys).Methods("GET")
	router.HandleFunc("/api/admin/api-keys", apiKeyHandler.DeleteAPIKey).Methods("DELETE")
	router.HandleFunc("/api/admin/api-keys/stats", apiKeyHandler.GetKeyStats).Methods("GET")

	// Register your extract endpoint (middleware already applied)
	// router.HandleFunc("/api/v1/extract", extractHandler).Methods("POST")

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

---

## Add to Navigation in `/fauntend/src/app/admin/layout.tsx`

Find the navigation section and add these 2 lines:

```tsx
<Link href="/admin/api-keys" className="px-4 py-2 rounded hover:bg-gray-800">
  🔑 API Keys
</Link>

<Link href="/admin/extract-playground" className="px-4 py-2 rounded hover:bg-gray-800">
  🧪 Extract Playground
</Link>
```

---

## Environment Variables to Add

**Backend:** `DATABASE_URL="postgresql://..."`  
**Frontend:** No new variables needed

---

## Execute in Supabase SQL Editor

**First:** Copy/paste entire EXTRACT_API_KEYS.sql  
**Optional:** Copy/paste entire CHAT_API_KEYS.sql (if using chat)

---

## Quick Commands to Test

```bash
# Test backend starts
cd backend
go run ./cmd/server

# Test frontend pages load
cd fauntend
npm run dev
# Visit: http://localhost:3000/admin/api-keys
```

Done! 🎉
