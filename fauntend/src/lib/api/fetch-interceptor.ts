'use client';

let isUnauthorized = false;
let unauthorizationTimeout: NodeJS.Timeout | null = null;

export function resetUnauthorizationFlag() {
    isUnauthorized = false;
    if (unauthorizationTimeout) clearTimeout(unauthorizationTimeout);
    unauthorizationTimeout = null;
}

/**
 * Global fetch wrapper that:
 * - Prevents 401 cascade (stops retries on auth failure)
 * - Implements exponential backoff
 * - Catches network errors gracefully
 */
export async function secureGlobalFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: {
        maxRetries?: number;
        backoffMs?: number;
        onUnauthorized?: () => void;
    }
): Promise<Response> {
    const maxRetries = options?.maxRetries ?? 0; // Default: no retries
    const backoffMs = options?.backoffMs ?? 1000;
    const onUnauthorized = options?.onUnauthorized;

    // If already in unauthorized state, reject immediately
    if (isUnauthorized) {
        const err = new Error('Already unauthorized - redirecting to login');
        err.name = '401-Unauthorized';
        throw err;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(input, init);

            // Handle 401 - stop all retries and redirect
            if (response.status === 401) {
                isUnauthorized = true;
                unauthorizationTimeout = setTimeout(() => {
                    resetUnauthorizationFlag();
                }, 30000); // Reset after 30s to allow manual re-login

                if (onUnauthorized) {
                    onUnauthorized();
                } else if (typeof window !== 'undefined') {
                    window.location.replace('/su');
                }

                const err = new Error('Unauthorized');
                err.name = '401-Unauthorized';
                throw err;
            }

            // All other status codes (including 5xx) return as-is
            return response;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // Don't retry on 401
            if (err instanceof Error && err.name === '401-Unauthorized') {
                throw err;
            }

            // Retry on network errors only
            if (attempt < maxRetries) {
                const delay = backoffMs * Math.pow(2, attempt);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            break;
        }
    }

    // All retries exhausted
    if (lastError) throw lastError;
    throw new Error('Fetch failed after retries');
}
