import type { NextConfig } from "next";

// ─── Backend URL ──────────────────────────────────────────────────────────────
// BACKEND_URL  → server-side only (drives Next.js rewrites, never sent to browser)
// NEXT_PUBLIC_API_URL → client-side (media streaming, proxy URLs in browser)
// Fallback ensures auto-connect even when env vars are not explicitly set.
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://nafijthepro-downloader.onrender.com';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Content Security Policy ──────────────────────────────────────────────────
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", "data:", "blob:", "https:", "http://localhost:*"],
  'font-src': ["'self'", "data:"],
  'connect-src': [
    "'self'",
    "https://*.supabase.co",
    "https://*.onrender.com",
    "https://*.vercel.app",
    "https://nafijthepro-downloader.onrender.com",
    "https://downloader.nafij.me",
    "https://downloader.nafijrahaman.me",
    "https://va.vercel-scripts.com",
    "https://discord.com",
    "wss://*.supabase.co",
    "http://localhost:*",
    ...(apiUrl ? [apiUrl] : []),
  ],
  // media-src must include the Render backend for video/audio streaming
  'media-src': [
    "'self'",
    "blob:",
    "https://*.onrender.com",
    "https://nafijthepro-downloader.onrender.com",
    "http://localhost:*",
    ...(apiUrl ? [apiUrl] : []),
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

const cspString = Object.entries(CSP_DIRECTIVES)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ');

// ─── Next.js Config ───────────────────────────────────────────────────────────
const nextConfig: NextConfig = {
  // ── Auto-connect: proxy lightweight JSON calls through Next.js ──────────────
  //
  // HOW IT WORKS:
  //   Browser → Vercel (same-origin, no CORS) → Render backend
  //
  // This means the frontend works even without NEXT_PUBLIC_API_URL being set,
  // because BACKEND_URL (server-side) drives these rewrites automatically.
  //
  // NOTE: Streaming endpoints (proxy, download, merge) are intentionally
  // excluded — large binary responses must go browser → Render directly to
  // avoid Vercel's response size limits. Those use NEXT_PUBLIC_API_URL.
  async rewrites() {
    return [
      // Media proxy — GET, streams binary
      // Used by discord-webhook.ts for thumbnails (small images, OK through Vercel).
      // Direct player/download URLs go via RENDER_API_URL in proxy.ts/media.ts.
      {
        source: '/api/v1/proxy',
        destination: `${BACKEND_URL}/api/v1/proxy`,
      },
      // Media extraction — POST, returns JSON
      {
        source: '/api/v1/extract',
        destination: `${BACKEND_URL}/api/v1/extract`,
      },
      // Merge — POST, streams merged video → direct via NEXT_PUBLIC_API_URL
      // (excluded from rewrite on purpose)

      // Public stats — GET, returns JSON
      {
        source: '/api/v1/stats/public',
        destination: `${BACKEND_URL}/api/v1/stats/public`,
      },
      // Public settings — GET, returns JSON
      {
        source: '/api/settings',
        destination: `${BACKEND_URL}/api/settings`,
      },
      // Health check — GET, returns JSON
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },

  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: cspString },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
      // Service Worker — must never be cached
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  // ── Image Domains ─────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'video.twimg.com' },
      { protocol: 'https', hostname: '**.sinaimg.cn' },
      { protocol: 'http',  hostname: '**.sinaimg.cn' },
      { protocol: 'https', hostname: '**.tiktokcdn.com' },
      { protocol: 'https', hostname: '**.tiktokcdn-us.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  reactStrictMode: true,
};

export default nextConfig;
