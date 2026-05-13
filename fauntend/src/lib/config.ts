/**
 * Centralized Configuration
 * Single source of truth for environment variables and constants
 *
 * AUTO-CONNECT STRATEGY
 * ─────────────────────
 * API_URL defaults to '' (empty string / same-origin).
 * → JSON API calls  (extract, settings, health, stats) → hit Next.js rewrites
 *   → rewritten to Render backend automatically. No CORS, no config needed.
 * → Streaming calls (proxy, download, merge) → proxy.ts / media.ts use
 *   NEXT_PUBLIC_API_URL directly so binaries go browser→Render, bypassing
 *   Vercel's response size limits.
 */

// API_URL: Use hardcoded production URL as fallback to ensure connection
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nafijpro-downloader-s3rj.onrender.com';

if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined') {
    console.info('[config] NEXT_PUBLIC_API_URL not set — using hardcoded fallback: https://nafijpro-downloader-s3rj.onrender.com');
}

// Supabase Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// App Constants
export const APP_NAME = 'DownAria';
export const APP_VERSION = '1.9.0';

// Production URLs (used by SEO / structured data)
export const PRODUCTION_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://downloader.nafij.me';
export const RENDER_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nafijpro-downloader-s3rj.onrender.com';

// Feature Flags
export const FEATURES = {
    AI_CHAT: true,
    YOUTUBE_MERGE: true,
    PUSH_NOTIFICATIONS: true,
} as const;

// Re-export for convenience
export { API_URL as apiUrl };
