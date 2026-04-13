# NAFIJPRO-DOWNLOADER - Production Deployment Guide

**Project**: DownAria Social Media Downloader  
**Frontend**: Next.js 16 (TypeScript) → Vercel  
**Backend**: Go 1.24 + FFmpeg + yt-dlp → Render (Docker)  
**Architecture**: Backend-for-Frontend (BFF) with HMAC signature validation  

---

## Deployment Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ↓
┌──────────────────────────────────┐
│   Vercel (Frontend)              │
│   https://example.vercel.app     │
├──────────────────────────────────┤
│ Next.js 16 + TypeScript          │
│ Routes: /api/web/* (JSON)        │
│ Rewrites to backend transparently│
└──────────┬───────────────────────┘
           │ Signed JSON requests
           │ (through Vercel)
           │
           ↓ Direct binary streams
           │ (from browser)
           │
┌──────────────────────────────────┐
│   Render (Backend)               │
│   https://api.onrender.com       │
├──────────────────────────────────┤
│ Go API + FFmpeg + yt-dlp         │
│ Routes: /api/web/* (signed)      │
│         /api/v1/* (public)       │
│ Health: /health                  │
└──────────┬───────────────────────┘
           │
           ↓
      ┌─────────────────────────────┐
      │  Social Media Platforms     │
      │  YouTube, TikTok, Instagram │
      │  Twitter, Facebook, Pixiv   │
      └─────────────────────────────┘
```

---

## Prerequisites

1. **GitHub Account** - With NAFIJPRO-DOWNLOADER repository
2. **Render Account** - Free tier available (https://render.com)
3. **Vercel Account** - Free tier available (https://vercel.com)
4. **Git** - Command line tool installed

---

## Quick Deploy (Auto-Setup)

### 1. Deploy Backend to Render

**Step A: Go to Render**
- Visit https://render.com/dashboard
- Click **"New +"** → **"Web Service"**
- Select **"Deploy an existing project from a Git repository"**
- Connect your GitHub account and select NAFIJPRO-DOWNLOADER

**Step B: Configure Service**
- **Name**: `downloader-api` (auto-populated)
- **Runtime**: Docker (auto-detected)
- **Region**: Oregon (default)
- **Branch**: main
- **Root Directory**: `backend`

**Step C: Confirm Environment**
- Review environment variables from `render.yaml` (auto-populated)
- Click **"Create Web Service"** to deploy
- **Wait 5-10 minutes** for build to complete
- Copy the backend URL: `https://downloader-api-xxxxx.onrender.com`

### 2. Deploy Frontend to Vercel

**Step A: Go to Vercel**
- Visit https://vercel.com/dashboard
- Click **"Add New"** → **"Project"**
- Select NAFIJPRO-DOWNLOADER from GitHub
- Set **Root Directory**: `fauntend`

**Step B: Add Environment Variables**

Before deployment, add these in the environment variables section:

```
NEXT_PUBLIC_API_URL = https://downloader-api-xxxxx.onrender.com
NEXT_PUBLIC_BASE_URL = https://YOUR_VERCEL_URL.vercel.app
BACKEND_URL = https://downloader-api-xxxxx.onrender.com
WEB_INTERNAL_SHARED_SECRET = (copy from Render environment)
NEXT_PUBLIC_SUPABASE_URL = (your Supabase URL if needed)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (your Supabase key if needed)
```

**Finding WEB_INTERNAL_SHARED_SECRET**:
- Go to Render Dashboard → Backend Service → Environment
- Find `WEB_INTERNAL_SHARED_SECRET` value
- Copy it to Vercel

**Step C: Deploy**
- Click **"Deploy"**
- **Wait 3-5 minutes** for build
- Vercel provides your frontend URL: `https://YOUR_PROJECT.vercel.app`

### 3. Update Backend ALLOWED_ORIGINS

Backend must accept requests from your Vercel frontend.

**In Render Dashboard**:
1. Go to backend service → Settings → Environment
2. Find `ALLOWED_ORIGINS` variable
3. Update to: `https://YOUR_VERCEL_URL.vercel.app`
4. Click **"Save"** (auto-redeploys)

### 4. Test Connection

In browser console on Vercel URL:
```javascript
fetch('/health').then(r => r.json()).then(console.log)
```

Expected:
```json
{"status":"healthy"}
```

---

## Manual Deployment (Detailed Steps)

### Backend Setup (Render)

**1. Connect GitHub**
```bash
# Ensure code is pushed
git add .
git commit -m "Production deployment setup"
git push origin main
```

**2. Create Render Service**
- https://render.com/dashboard → New Web Service
- Connect GitHub repository
- Select NAFIJPRO-DOWNLOADER

**3. Configure Service Details**

| Setting | Value |
|---------|-------|
| Name | `downloader-api` |
| Runtime | Docker |
| Region | Oregon (or nearest to users) |
| Plan | Free (upgrade for better performance) |
| Root Directory | `backend` |
| Dockerfile | `./Dockerfile` (auto-detected) |
| Health Check Path | `/health` |
| Health Check Interval | 30 seconds |

**4. Environment Variables**

Set in Render Dashboard → Environment:

```env
PORT=10000
ENV=production
WEB_INTERNAL_SHARED_SECRET=YOUR_RANDOM_SECRET_32_CHARS
PUBLIC_BASE_URL=https://downloader-api-xxxxx.onrender.com
ALLOWED_ORIGINS=https://YOUR_VERCEL_URL.vercel.app
MERGE_ENABLED=true
UPSTREAM_TIMEOUT_MS=15000
MAX_DOWNLOAD_SIZE_MB=512
GLOBAL_RATE_LIMIT_WINDOW=100/1m
EXTRACTION_MAX_RETRIES=3
CACHE_EXTRACTION_TTL=5m
CACHE_PROXY_HEAD_TTL=45s
STATS_PERSIST_ENABLED=true
```

**IMPORTANT**: 
- Generate strong random `WEB_INTERNAL_SHARED_SECRET` (use `openssl rand -base64 24`)
- `PUBLIC_BASE_URL` is auto-set by Render (check after first deploy)
- Update after Vercel deployment with correct `ALLOWED_ORIGINS`

**5. Deploy**
- Click **"Create Web Service"**
- Monitor deployment logs
- ✅ Backend ready when health check passes

**6. Get Backend URL**
- Render Dashboard shows: `https://downloader-api-xxxxx.onrender.com`

---

### Frontend Setup (Vercel)

**1. Connect GitHub**
- Vercel automatically detects frontend from `package.json`

**2. Import Project**
- https://vercel.com/dashboard → Add Project
- Select NAFIJPRO-DOWNLOADER
- Framework: Next.js (auto-detected)
- Root: `fauntend`

**3. Environment Variables**

Add in Vercel Settings → Environment Variables (set to all environments):

```env
# Required - from Render backend
NEXT_PUBLIC_API_URL=https://downloader-api-xxxxx.onrender.com
NEXT_PUBLIC_BASE_URL=https://YOUR_PROJECT.vercel.app
BACKEND_URL=https://downloader-api-xxxxx.onrender.com
WEB_INTERNAL_SHARED_SECRET=SAME_VALUE_AS_RENDER

# Optional - for Supabase auth
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Optional - for notifications
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

**4. Deploy**
- Click **"Deploy"**
- Vercel builds and deploys automatically
- ✅ When done, provides your frontend URL

**5. Verify**
- Visit `https://YOUR_PROJECT.vercel.app`
- Should load without errors
- Check browser console for network errors

---

## Architecture Details

### BFF Pattern (Backend-for-Frontend)

The frontend and backend use **request signing** for security:

1. **Frontend makes request** to `/api/web/extract`
2. **BFF layer signs request** with `WEB_INTERNAL_SHARED_SECRET` (HMAC-SHA256)
3. **Request rewrites** through Next.js to backend
4. **Backend validates signature** before processing
5. **Response returns** directly to frontend

**Request Headers Added by Frontend**:
```
X-Downaria-Timestamp: 2026-04-13T15:30:00Z
X-Downaria-Nonce: random-uuid-here
X-Downaria-Signature: hmac-sha256-signature
```

**Benefits**:
- Protects backend from unauthorized access
- Ensures requests come from your frontend
- Works seamlessly with browser same-origin policy

### Auto-Connection Features

**Next.js Rewrites** (`next.config.ts`):
- `/api/v1/extract` → proxies JSON through Next.js
- `/api/v1/proxy` → proxies JSON thumbnails
- Binary streams (download, merge) → direct to backend

**Result**: Frontend works even without explicit `NEXT_PUBLIC_API_URL`

---

## Environment Variables Complete Reference

### Backend (Render) - Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port (Render uses 10000) | `10000` |
| `ENV` | Environment (must be production) | `production` |
| `WEB_INTERNAL_SHARED_SECRET` | **CRITICAL** - Signs requests | `random-32-char-secret` |
| `PUBLIC_BASE_URL` | Backend public URL | `https://api.onrender.com` |
| `ALLOWED_ORIGINS` | Frontend URL (CORS) | `https://example.vercel.app` |

### Backend (Render) - Optional

| Variable | Purpose | Default | Production |
|----------|---------|---------|------------|
| `MERGE_ENABLED` | Enable video+audio merge | true | true |
| `UPSTREAM_TIMEOUT_MS` | External API timeout | 10000 | 15000 |
| `MAX_DOWNLOAD_SIZE_MB` | Max file download | 1024 | 512 |
| `GLOBAL_RATE_LIMIT_WINDOW` | Rate limiting | 60/1m | 100/1m |
| `CACHE_EXTRACTION_TTL` | Cache results duration | 5m | 5m |
| `CACHE_PROXY_HEAD_TTL` | Cache metadata | 45s | 45s |
| `STATS_PERSIST_ENABLED` | Save stats to disk | false | true |

### Frontend (Vercel) - Required

| Variable | Purpose | Type |
|----------|---------|------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Public |
| `NEXT_PUBLIC_BASE_URL` | Frontend URL | Public |
| `BACKEND_URL` | Backend (server-side) | Secret |
| `WEB_INTERNAL_SHARED_SECRET` | Must match backend | Secret |

### Frontend (Vercel) - Optional

| Variable | Purpose | Type |
|----------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase auth | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase key | Public |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notifications | Public |

---

## Deployment Checklist

### Before Deployment
- [ ] Push all changes to GitHub (`git push origin main`)
- [ ] Update `.env.example` files if needed
- [ ] Backend Dockerfile builds locally: `docker build -t test backend/`
- [ ] Frontend builds locally: `cd fauntend && npm run build`

### Backend (Render) Deployment
- [ ] Create Render account and connect GitHub
- [ ] Create Web Service with Docker runtime
- [ ] Set `WEB_INTERNAL_SHARED_SECRET` (strong random value)
- [ ] Deploy and verify `/health` endpoint
- [ ] Note backend URL: `https://downloader-api-xxxxx.onrender.com`
- [ ] Copy `WEB_INTERNAL_SHARED_SECRET` value

### Frontend (Vercel) Deployment
- [ ] Create Vercel account and connect GitHub
- [ ] Set Root Directory: `fauntend`
- [ ] Add environment variables:
  - `NEXT_PUBLIC_API_URL` (from Render)
  - `NEXT_PUBLIC_BASE_URL` (from Vercel)
  - `BACKEND_URL` (from Render)
  - `WEB_INTERNAL_SHARED_SECRET` (from Render)
- [ ] Deploy and verify frontend loads
- [ ] Check browser console for errors

### Post-Deployment
- [ ] Update Backend `ALLOWED_ORIGINS` with Vercel URL
- [ ] Test `/health` endpoint: `curl https://backend-url/health`
- [ ] Test extraction: Try YouTube video on frontend
- [ ] Check Network tab: Requests should be signed
- [ ] Monitor Render logs for errors
- [ ] Monitor Vercel analytics for errors

---

## Verification Tests

### 1. Backend Health Check
```bash
curl https://YOUR_RENDER_URL/health
```
Expected 200 with:
```json
{"status":"healthy"}
```

### 2. Frontend Loads
Visit `https://YOUR_VERCEL_URL` in browser  
Expected: App loads, no console errors

### 3. Network Connection
In browser console:
```javascript
fetch('https://YOUR_RENDER_URL/health')
  .then(r => r.json())
  .then(console.log)
```

### 4. Extraction Works
1. Visit frontend
2. Enter: `https://www.youtube.com/watch?v=VIDEO_ID`
3. Click Extract
4. Check Network tab:
   - Request to `/api/v1/extract`
   - Should have `X-Downaria-*` headers
   - Response with video metadata

---

## Troubleshooting

### Backend Won't Deploy

**Problem**: "WEB_INTERNAL_SHARED_SECRET is required"
- **Fix**: Set `WEB_INTERNAL_SHARED_SECRET` in Render environment
- **Verify**: `docker build backend/` locally first

**Problem**: "Port already in use"
- **Fix**: Render handles this automatically; restart service
- **Check**: Render Dashboard → Service → Restart

### Frontend Shows Blank Page

**Problem**: 404 or blank page on Vercel URL
- **Fix**: Verify Root Directory is `fauntend` (typo in folder name!)
- **Check**: Vercel Build Logs for errors
- **Fix**: May need to redeploy: Vercel → Deployments → Redeploy

### CORS Error: "Origin not allowed"

**Problem**: Network tab shows CORS rejection
- **Fix**: Update backend `ALLOWED_ORIGINS` in Render
- **Syntax**: `https://example.vercel.app` (no trailing slash)
- **Multiple**: Use comma-separated: `https://a.vercel.app,https://b.vercel.app`
- **Wait**: After update, Render auto-redeploys (wait 2-3 minutes)

### Signature Validation Failed (403)

**Problem**: Network shows 403 error with "Signature validation failed"
- **Cause**: `WEB_INTERNAL_SHARED_SECRET` mismatch
- **Fix**: Verify identical value in Render AND Vercel
- **Copy**: Copy character-by-character, no spaces
- **Redeploy**: Vercel auto-redeploys on env var change

### Timeout: "Request timeout"

**Problem**: Extraction hangs or times out
- **Fix**: Increase `UPSTREAM_TIMEOUT_MS` in Render (e.g., 30000)
- **Fix**: Upgrade Render plan (free tier is slow)
- **Retry**: Browser automatically retries; check backend logs

### Media Won't Stream/Download

**Problem**: Can extract but can't download or stream
- **Fix**: Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- **Fix**: Check backend CORS allows media serve
- **Check**: Browser Network tab should show direct request to Render

---

## Scaling & Optimization

### Render Backend
- **Free Tier**: Auto-spins down after 15 minutes inactivity
- **Pro Tier** ($7/month): Always running, better performance
- **Regional**: Deploy closer to users in Settings → Region

### Vercel Frontend
- **Automatic**: Scales infinitely, no configuration needed
- **Caching**: Set in `vercel.json` (already configured)
- **Analytics**: Enable in Vercel Dashboard for insights

### Performance Tips
1. **Rate Limiting**: Start with 60/1m, increase based on usage
2. **Download Size**: Set `MAX_DOWNLOAD_SIZE_MB` to 512 (balance storage)
3. **Caching**: Adjust `CACHE_EXTRACTION_TTL` (5m default is good)
4. **Timeout**: Increase `UPSTREAM_TIMEOUT_MS` if videos take time

---

## Monitoring & Logs

### Backend Logs (Render)
- Dashboard → Service → Logs
- Shows all API requests and errors
- Green checkmarks = healthy
- Red X = service down

### Frontend Logs (Vercel)
- Dashboard → Project → Deployments → Logs
- Shows build information
- Browser Console (F12) shows runtime errors

### Health Monitoring
```bash
# Check backend health regularly
watch -n 60 'curl -s https://YOUR_RENDER_URL/health | jq'
```

---

## Rollback to Previous Version

### Backend (Render)
1. Render Dashboard → Select Backend Service
2. Click Deployments
3. Find previous successful deploy
4. Click **Redeploy** button

### Frontend (Vercel)
1. Vercel Dashboard → Select Project
2. Click Deployments
3. Find previous deployment
4. Click arrows icon → **Redeploy**

---

## Custom Domains (Optional)

### Backend Custom Domain
1. Render Dashboard → Service Settings
2. Add Custom Domain: `api.example.com`
3. Add CNAME record to DNS
4. Verify and activate

### Frontend Custom Domain
1. Vercel Dashboard → Project Settings → Domains
2. Add Domain: `example.com`
3. Add CNAME record: `cname.vercel-dns.com`
4. Verify DNS and activate

---

## Deployment Files Reference

| File | Purpose | Used By |
|------|---------|---------|
| `/render.yaml` | Backend config (auto-deploy) | Render |
| `/vercel.json` | Frontend config + headers | Vercel |
| `/backend/Dockerfile` | Docker image for backend | Render |
| `/backend/.env.example` | Backend env template | Developers |
| `/fauntend/.env.example` | Frontend env template | Developers |

---

## Support & Resources

- **Backend Issues**: Check Render logs + `/health` endpoint
- **Frontend Issues**: Check Vercel build logs + browser console
- **Connection Issues**: Verify `WEB_INTERNAL_SHARED_SECRET` matches
- **API Documentation**: `/backend/Documentation/API_Routes.md`
- **Architecture**: `/backend/CLAUDE.md`

---

**Last Updated**: 2026-04-13  
**Tested On**: Render Free Tier + Vercel Free Tier
