# 🔧 TROUBLESHOOTING & FINAL SETUP GUIDE

**Last Updated:** 2026-04-14  
**Status:** All code fixed, needs environment configuration

---

## ⚠️ CURRENT ISSUES & SOLUTIONS

### 1. ✅ FIXED: Groq Model Decommissioned

**Error:** `The model 'mixtral-8x7b-32768' has been decommissioned`

**Solution:** Updated to `llama-3.1-70b-versatile` (current available model)

**Commit:** `8a095fc`

---

### 2. 🔴 CRITICAL: Database Not Connected on Backend

**Error Examples:**
```
Failed to connect to database: network is unreachable
GET https://nafijpro-downloader.onrender.com/api/admin/api-keys 404 (Not Found)
```

**Root Cause:** `DATABASE_URL` environment variable not set in Render backend

**Solution:**

1. **Get your Supabase connection string:**
   - Log into [Supabase Console](https://app.supabase.com)
   - Select your project
   - Go to Settings → Database → Connection String
   - Copy the PostgreSQL connection string (looks like: `postgresql://user:password@host:port/dbname`)

2. **Set in Render Dashboard:**
   ```
   Dashboard → Your Project → Environment Variables
   
   Key: DATABASE_URL
   Value: postgresql://...
   
   Save → Redeploy
   ```

3. **Verify Connection:**
   - Check Render logs: `$ render logs`
   - Should see: `✓ Database connected successfully`

---

### 3. 🟡 MINOR: Admin Pages Throwing 404 Errors

**Error Examples:**
```
GET /api/admin/apikeys 404
GET /api/admin/stats?days=7 404
```

**Reason:** Other admin pages (users, settings, etc.) are looking for endpoints that don't exist (not part of this implementation)

**Status:** Expected - these pages are trying to fetch data from unimplemented admin features. Safe to ignore for now.

**Frontend shows:** "API Keys" page will still work once database is connected

---

## 📋 COMPLETE SETUP CHECKLIST

### Before Deployment (Required)

- [ ] **Step 1: Supabase Database Setup**
  ```
  1. Log into Supabase
  2. Select your project
  3. Go to SQL Editor
  4. Copy/paste EXTRACT_API_KEYS.sql (entire file)
  5. Click "Run"
  6. Verify tables created: api_keys, api_key_usage
  ```

- [ ] **Step 2: Supabase Connection String**
  ```
  1. Settings → Database → Connection String
  2. Copy PostgreSQL string
  3. Keep it safe (don't share)
  ```

- [ ] **Step 3: Backend Environment Variables (Render/Railway)**
  ```
  Set in Dashboard → Environment Variables:
  
  DATABASE_URL=postgresql://user:pass@host:port/db
  GROQ_API_KEY=gsk_... (optional, has fallback)
  WEB_INTERNAL_SHARED_SECRET=your_secret
  ALLOWED_ORIGINS=https://your-frontend.vercel.app
  PORT=8080
  ```

- [ ] **Step 4: Frontend Environment Variables (Vercel)**
  ```
  Set in Dashboard → Settings → Environment Variables:
  
  NEXT_PUBLIC_API_URL=https://your-backend-render.com
  ```

- [ ] **Step 5: Redeploy Both**
  ```
  Git Push → Vercel auto-deploys frontend
  Git Push → Render auto-deploys backend
  ```

- [ ] **Step 6: Verify Deployment**
  ```
  Test Chat:
  curl https://your-backend/api/v1/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello"}'
  
  Should respond with Groq answer (not error)
  
  Test Admin Page:
  https://your-frontend.vercel.app/admin/api-keys
  Should load and show "No API keys yet"
  ```

---

## 🚀 WHAT TO EXPECT AFTER SETUP

### ✅ When Everything Works:

1. **Chat Endpoint** (Public - No Auth)
   ```bash
   POST /api/v1/chat
   Content-Type: application/json
   
   {"message": "Hello"}
   
   Response: {"success": true, "text": "...", "provider": "groq", "model": "llama-3.1-70b-versatile"}
   ```

2. **Admin Dashboard** (`/admin/api-keys`)
   - Shows "No API keys yet"
   - "New Key" button creates keys
   - Keys shown once, then hidden
   - Can list, view usage stats, delete

3. **Extract Playground** (`/admin/extract-playground`)
   - Text fields for API Key + URL
   - "Test Extract" sends request
   - Shows response + stats

---

## 🔍 DEBUGGING STEPS

### If Backend Still Says "404"

```bash
# 1. Check if backend is running
curl https://your-backend/api/v1/chat

# 2. Check logs on Render
render logs -t 50  # Last 50 lines

# 3. Look for: "✓ Database connected successfully"
# If not present, DATABASE_URL not set

# 4. Verify database URL format
# Should be: postgresql://user:password@host.supabase.co:5432/postgres
```

### If API Keys Page Shows Objects

```
Issue: Page displays "[object Object]" instead of key data
Reason: API response parsing issue
Solution: Check browser console (F12 → Console tab)
Look for: Any error messages about the response
```

### If Chat Returns Empty Response

```
Issue: Chat works but returns no text
Reason: Groq API rate limit or token issues
Check:
1. GROQ_API_KEY is set
2. Groq account has API credits
3. Check Groq dashboard for errors
```

---

## 📊 FILE CHANGES THIS SESSION

### Backend
- `internal/transport/http/handlers/chat.go` - Updated Groq model
- `internal/app/app.go` - Database initialization
- `internal/core/config/types.go` - Added DatabaseURL field
- `internal/core/config/loader.go` - Load DATABASE_URL from env

### Frontend
- `fauntend/src/app/admin/api-keys/page.tsx` - Fixed TypeScript types
- `fauntend/src/app/admin/extract-playground/page.tsx` - Fixed TypeScript + error handling
- `fauntend/src/app/admin/layout.tsx` - Added navigation links

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Get Supabase PostgreSQL Connection String**
   - Open [Supabase Console](https://app.supabase.com)
   - Navigate to your project
   - Go to Settings → Database
   - Copy PostgreSQL URI (full connection string)

2. **Execute SQL Migrations**
   - Go to Supabase SQL Editor
   - Copy/paste entire EXTRACT_API_KEYS.sql file
   - Click "Run" to create tables

3. **Set Backend Environment Variable**
   - Go to Render Dashboard
   - Select your backend project
   - Environment Variables → Add:
     - Key: `DATABASE_URL`
     - Value: `postgresql://...` (from step 1)
   - Click "Save" → Auto-redeploys

4. **Wait for Render Deploy**
   - Takes 2-5 minutes
   - Check logs to see "✓ Database connected successfully"

5. **Test Admin Page**
   - Visit `/admin/api-keys` on Vercel app
   - Should no longer show 404 errors
   - Should load admin dashboard

---

## 📞 COMMON ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 errors on admin pages | DATABASE_URL not set | Set environment variable in Render |
| Chat returns model error | Groq model changed | Already fixed ✅ |
| Page shows `[object Object]` | Response not parsed | Open console (F12) for errors |
| "Network is unreachable" | DB connection failed | Verify connection string format |
| Admin page won't create keys | Database tables missing | Execute EXTRACT_API_KEYS.sql |
| Keys page stays loading | Backend not responding | Check Render logs |

---

## ✨ SUMMARY

**Code Status:** ✅ Complete & Deployed  
**TypeScript Errors:** ✅ All Fixed  
**Groq Model:** ✅ Updated to llama-3.1-70b-versatile  
**Frontend Build:** ✅ Passing  
**Backend Build:** ✅ Passing  

**What's Needed:** Just 2 things:
1. Database connection string from Supabase
2. Execute SQL migrations
3. Set DATABASE_URL in Render environment

**Estimated Time to Full Working System:** 10 minutes

---

**Ready to deploy! Just follow the setup checklist above.** 🎉
