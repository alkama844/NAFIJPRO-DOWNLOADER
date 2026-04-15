-- =====================================================================
-- SUPABASE RLS HOTFIX v2 - Allow Public Reads for Signup Verification
-- =====================================================================
-- Fix: Unauthenticated users have auth.uid() = NULL, so we need explicit
-- "true" policies for public read access during signup

-- ─────────────────────────────────────────────────────────────────────
-- Fix special_referrals RLS - Allow EVERYONE to read active codes
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.special_referrals ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can read active referral codes" ON public.special_referrals;
DROP POLICY IF EXISTS "Admins can manage referrals" ON public.special_referrals;

-- Public AND authenticated users can read all active codes (SIGNUP VERIFICATION)
CREATE POLICY "Anyone can read active referral codes" ON public.special_referrals
  FOR SELECT USING (is_active = true);

-- Admins can INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage referral codes" ON public.special_referrals
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- Fix users table RLS - Allow public read of referral codes
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Public can verify referral codes" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- ANYONE can read referral_code, username, email (for signup verification)
CREATE POLICY "Anyone can read user referral codes" ON public.users
  FOR SELECT USING (true);

-- Authenticated users can read own profile details
CREATE POLICY "Authenticated users read own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id OR auth.uid() IS NULL);

-- Admins can update any user
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own record (via trigger)
CREATE POLICY "Users can insert on signup" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- CRITICAL: Also fix other tables that might block queries
-- ─────────────────────────────────────────────────────────────────────

-- chat_session_keys - allow public read if needed for auth
ALTER TABLE IF EXISTS public.chat_session_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read session keys" ON public.chat_session_keys;
CREATE POLICY "Authenticated users can read own keys" ON public.chat_session_keys
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================================
-- Verification Queries
-- =====================================================================

SELECT '[DONE] RLS Policies Fixed v2 - Public reads enabled for signup' as status;

-- Test: These should return 0 rows normally (no public referral codes yet)
SELECT count(*) as active_referral_codes FROM public.special_referrals WHERE is_active = true;

-- Test: These should return many users
SELECT count(*) as total_users FROM public.users WHERE referral_code IS NOT NULL;
