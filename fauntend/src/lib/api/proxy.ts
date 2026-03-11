/**
 * Proxy URL Helper
 * Builds proxy URLs pointing directly to the Render backend for media streaming.
 *
 * WHY DIRECT (not via Next.js rewrite):
 *   These URLs are embedded in <img src>, <video src>, fetch() for binary data.
 *   Routing large binary streams through Vercel hits response size limits and
 *   adds unnecessary latency. Always go browser → Render for streaming.
 */

import { RENDER_API_URL } from '@/lib/config';
import type { PlatformId } from '@/lib/types';

// Always the direct Render URL — never a relative path
const MEDIA_BASE = RENDER_API_URL;

export function getProxyUrl(url: string, options?: {
    filename?: string;
    platform?: string;
    inline?: boolean;
    head?: boolean;
    hls?: boolean;
}): string {
    const params = new URLSearchParams();
    params.set('url', url);

    if (options?.filename) params.set('filename', options.filename);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.inline) params.set('inline', '1');
    if (options?.head) params.set('head', '1');
    if (options?.hls) params.set('hls', '1');

    return `${MEDIA_BASE}/api/v1/proxy?${params.toString()}`;
}

/**
 * Get proxied thumbnail URL — all thumbnails go through the media proxy
 * for consistent loading and to bypass platform hotlink restrictions.
 */
export function getProxiedThumbnail(url: string | undefined, platform?: PlatformId | string): string {
    if (!url) return '';
    return getProxyUrl(url, { platform: platform as string, inline: true });
}
