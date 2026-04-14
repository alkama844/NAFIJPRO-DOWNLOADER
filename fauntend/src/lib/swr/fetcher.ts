/**
 * SWR Fetcher & Configuration
 * Centralized data fetching with caching, deduplication, and smart revalidation
 */

// Helper to extract error message from response
async function getErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    try {
      return await res.text();
    } catch {
      return res.statusText;
    }
  }
  return `HTTP ${res.status}`;
}

// Default fetcher for SWR
export const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorMsg = await getErrorMessage(res);
        const error = new Error(`HTTP ${res.status}: ${errorMsg}`);
        throw error;
    }
    return res.json();
};

// Fetcher with credentials (for admin APIs)
export const adminFetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const errorMsg = await getErrorMessage(res);
        const error = new Error(`HTTP ${res.status}: ${errorMsg}`);
        throw error;
    }
    return res.json();
};

// POST fetcher for mutations
export const postFetcher = async <T>(url: string, data: unknown): Promise<T> => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorMsg = await getErrorMessage(res);
        const error = new Error(`HTTP ${res.status}: ${errorMsg}`);
        throw error;
    }
    return res.json();
};

// SWR Configuration presets
export const SWR_CONFIG = {
    // For data that rarely changes (platform status, settings)
    static: {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshInterval: 0,
        dedupingInterval: 60000, // 60 seconds
    },
    
    // For data that changes occasionally (admin stats)
    moderate: {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        refreshInterval: 60000, // 1 minute
        dedupingInterval: 30000, // 30 seconds
    },
    
    // For real-time data (live stats)
    realtime: {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        refreshInterval: 10000, // 10 seconds
        dedupingInterval: 5000, // 5 seconds
    },
    
    // For one-time fetch (no auto-refresh)
    once: {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        refreshInterval: 0,
    },
} as const;
