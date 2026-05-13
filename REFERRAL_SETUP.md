# 🔑 Referral Code System - Setup & Usage Guide

## What is a Referral Code?

A **referral code** is required to create an account. There are 2 types:

1. **Special Referral Codes** (Admin-controlled)
   - Format: `NAFIJ26`, `ADMIN001`, etc.
   - Stored in `special_referrals` database table
   - Can grant roles (user/admin)
   - Can limit usage (unlimited, or max N uses)
   - Can expire at a specific date

2. **User Referral Codes** (Generated per user)
   - Each user gets their own code like: `USER_abc123def`
   - Other users can use it to sign up
   - Tracks who referred whom
   - Used for affiliate/reward systems

---

## 📌 Setup: Create Your First Referral Code

### Step 1: Get Your Supabase Service Role Key

1. Go to: **https://app.supabase.com**
2. Select your project → **Settings → API**
3. Copy **`service_role` (secret)** key
4. ⚠️ **KEEP THIS SECRET!** Never commit it to git

### Step 2: Create `.env.local` in Frontend

Create `fauntend/.env.local` with:

```env
# From .env.example
NEXT_PUBLIC_BASE_URL=https://downloader-nafijrahaman.vercel.app
NEXT_PUBLIC_API_URL=https://nafijpro-downloader-s3rj.onrender.com
BACKEND_URL=https://nafijpro-downloader-s3rj.onrender.com
WEB_INTERNAL_SHARED_SECRET=nafijrahaman_7f3c9d8a4b2e6f1a9c0d5e8b7a3f2c1d

# Add these two (from Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://wbfjtbbvymswtsqodusy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ojMo8BK-7_pfVkNbjmf8lg_jYq3_TRt
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Create Referral Code Using CLI Script

```bash
# Navigate to project root
cd /workspaces/NAFIJPRO-DOWNLOADER

# Make script executable
chmod +x scripts/create-referral.js

# Create referral code NAFIJ26
node scripts/create-referral.js NAFIJ26

# Or with custom options:
node scripts/create-referral.js NAFIJ26 user 0     # unlimited uses
node scripts/create-referral.js ADMIN_KEY admin 50 # 50 uses, admin role
```

---

## 🚀 How to Create Referral Codes

### Option A: Using CLI Script (Recommended)

```bash
node scripts/create-referral.js NAFIJ26
```

**Output:**
```
✅ Referral code created successfully!

📋 Details:
   Code: NAFIJ26
   Role: user
   Max Uses: Unlimited
   Status: Active
   Created: 4/13/2026, 5:42:00 PM
```

### Option B: Using API Endpoint

Create an admin auth token, then:

```bash
curl -X POST http://localhost:3000/api/admin/referral \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{
    "code": "NAFIJ26",
    "role": "user",
    "max_uses": 0,
    "expires_at": "2025-12-31"
  }'
```

### Option C: Direct Supabase Dashboard

1. Go to **Supabase Dashboard → SQL Editor**
2. Run:

```sql
INSERT INTO special_referrals (code, role, max_uses, current_uses, is_active, created_at)
VALUES ('NAFIJ26', 'user', 0, 0, true, NOW());
```

---

## ✅ Verify Existing Codes

### Check in CLI:

```bash
# View in database (Supabase SQL Editor)
SELECT code, role, max_uses, current_uses, is_active, created_at
FROM special_referrals
WHERE code = 'NAFIJ26';
```

### Check in Auth Page:

1. Go to app login page
2. Click "Create Account"
3. Enter code: `NAFIJ26`
4. If ✅ valid, you proceed to account details
5. If ❌ invalid, error message shows

---

## 🔒 Security Notes

- **Service Role Key** is secret - never commit to git
- **Add to `.gitignore`**: fauntend/.env.local
- Rotate keys regularly in production
- Use environment variables in hosting (Vercel, etc.)

---

## 📊 Database Schema

### special_referrals Table

```sql
CREATE TABLE special_referrals (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user' (user|admin),
  max_uses INTEGER DEFAULT 0 (0 = unlimited),
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎯 Common Use Cases

### Example 1: Create Test Registration Code
```bash
node scripts/create-referral.js TEST_CODE user 0
```

### Example 2: Create Admin Code (Limited Uses)
```bash
node scripts/create-referral.js ADMIN_2024 admin 5
```

### Example 3: Create Temporary Campaign Code
```bash
node scripts/create-referral.js SUMMER_2024 user 100
```

---

## 🆘 Troubleshooting

**Problem**: "Missing environment variables"
- **Solution**: Create fauntend/.env.local with SUPABASE keys

**Problem**: "Referral code already exists"
- **Solution**: Use a different code name

**Problem**: "Database error"
- **Solution**: Check Supabase connection and permissions

---

## 📞 Need Help?

- Check `.env.local` has all Supabase keys
- Verify `special_referrals` table exists in Supabase
- Ensure service role key has insert permissions
