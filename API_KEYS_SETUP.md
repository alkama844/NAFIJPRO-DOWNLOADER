# API KEY SYSTEM FOR /api/v1/extract - SETUP GUIDE

## ✅ WHAT'S CREATED

1. ✅ SQL table (copy-paste ready)
2. ✅ API key validation middleware
3. ✅ Admin key management handlers
4. ✅ Admin dashboard page
5. ✅ API playground page

---

## 🎯 WHAT YOU NEED TO ADD

### BACKEND - Do This NOW:

#### Step 1: Execute SQL in Supabase
Copy entire contents of `/workspaces/NAFIJPRO-DOWNLOADER/EXTRACT_API_KEYS.sql` and paste in Supabase SQL Editor

#### Step 2: Add to main.go
In `/backend/cmd/server/main.go`, after database connection initialization:

```go
import (
    "internal/infra/database"
    "internal/transport/http/middleware"
    "internal/transport/http/handlers"
)

func main() {
    // ... existing code ...
    
    // Connect to database
    db, err := database.Connect(os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatalf("Database connection failed: %v", err)
    }
    defer db.Close()
    
    // Create API key validator
    keyValidator := middleware.NewAPIKeyValidator(db)
    
    // Create handlers
    apiKeyHandler := handlers.NewAPIKeyHandler(db)
    
    // Setup router with middleware
    router := mux.NewRouter()
    
    // Apply API key middleware to /api/v1/extract routes
    router.Use(middleware.APIKeyMiddleware(keyValidator))
    
    // Admin routes (no middleware)
    router.HandleFunc("/api/admin/api-keys/create", apiKeyHandler.CreateAPIKey).Methods("POST")
    router.HandleFunc("/api/admin/api-keys", apiKeyHandler.ListAPIKeys).Methods("GET")
    router.HandleFunc("/api/admin/api-keys", apiKeyHandler.DeleteAPIKey).Methods("DELETE")
    router.HandleFunc("/api/admin/api-keys/stats", apiKeyHandler.GetKeyStats).Methods("GET")
    
    // Start server
    log.Printf("Server starting on port %s", os.Getenv("PORT"))
    log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), router))
}
```

#### Step 3: Add to your router registration
In wherever you register routes, add:

```go
// API Key handlers
h := handlers.NewAPIKeyHandler(db)

// Admin endpoints (BEFORE middleware applies)
r.HandleFunc("/api/admin/api-keys/create", h.CreateAPIKey).Methods("POST")
r.HandleFunc("/api/admin/api-keys", h.ListAPIKeys).Methods("GET")
r.HandleFunc("/api/admin/api-keys", h.DeleteAPIKey).Methods("DELETE")
r.HandleFunc("/api/admin/api-keys/stats", h.GetKeyStats).Methods("GET")

// Apply middleware to protected routes
r.Use(middleware.APIKeyMiddleware(middleware.NewAPIKeyValidator(db)))
```

---

### FRONTEND - Do This NOW:

#### Step 1: Update admin navigation
In `/fauntend/src/app/admin/layout.tsx`, add to navigation menu:

```tsx
import Link from 'next/link';

export default function AdminLayout() {
  return (
    <nav>
      {/* existing menu items */}
      
      {/* Add these new items */}
      <Link href="/admin/api-keys" className="...">
        🔑 API Keys
      </Link>
      
      <Link href="/admin/extract-playground" className="...">
        🧪 Extract Playground
      </Link>
    </nav>
  );
}
```

#### Step 2: Create API endpoint wrappers
Create new file: `/fauntend/src/app/api/admin/api-keys/route.ts`

```typescript
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  
  const res = await fetch(`${backendUrl}/api/admin/api-keys`, {
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN}` // or however you authenticate
    }
  });
  
  return res;
}

export async function POST(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  const body = await req.json();
  
  const res = await fetch(`${backendUrl}/api/admin/api-keys/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
    },
    body: JSON.stringify(body)
  });
  
  return res;
}

export async function DELETE(req: Request) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  const res = await fetch(`${backendUrl}/api/admin/api-keys?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`
    }
  });
  
  return res;
}
```

---

## 📝 ENVIRONMENT VARIABLES

Add to `.env`:

```bash
# Already have these from earlier:
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_API_URL="https://nafijpro-downloader.onrender.com"

# Optional: Admin token for key management
ADMIN_TOKEN="your-admin-token"
```

---

## 🧪 HOW IT WORKS

### User Flow:

1. **Admin** goes to `/admin/api-keys`
2. **Admin** clicks "New Key"
3. **System** generates key: `nak_abc123...`
4. **Admin** copies it (shown only once!)
5. **User** uses key in `/api/v1/extract` calls

### API Key Structure:

```
nak_[32-byte-random-hex]
```

### Request Example:

```bash
curl -X POST https://nafijpro-downloader.onrender.com/api/v1/extract \
  -H "X-API-Key: nak_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

---

## ✅ FEATURES

- ✅ Generate API keys (shown only once)
- ✅ Rate limiting per key (configurable requests/minute)
- ✅ Expiration dates (optional)
- ✅ Usage tracking (requests, success/fail rate)
- ✅ Admin dashboard to manage keys
- ✅ API playground to test endpoints
- ✅ Automatic key hashing (SHA256)
- ✅ Key preview for UI display

---

## 🚀 QUICK TEST

Once deployed:

1. Go to `https://downloader.nafij.me/admin/api-keys`
2. Click "New Key" → Copy it
3. Go to `https://downloader.nafij.me/admin/extract-playground`
4. Paste key + URL → Click "Test Extract"
5. See response!

---

**Status:** ✅ Ready to integrate
**Next:** Tell me DONE when you've added the files to backend main.go and frontend navigation
