/**
 * useUpdatePrompt Hook - Service Worker update settings
 *
 * Fetches public settings from /api/settings (no auth required)
 */
'use client';

import useSWR from 'swr';
import { fetcher, SWR_CONFIG } from '@/lib/swr';

import { API_URL } from '@/lib/config';

interface PublicSettings {
    update_prompt_mode?: string;
    maintenance_mode?: boolean;
    maintenance_message?: string;
}

interface SettingsResponse {
    success: boolean;
    data: PublicSettings;
}

export function useUpdatePrompt() {
    const { data, error, isLoading } = useSWR<SettingsResponse>(
        `${API_URL}/api/settings`,
        fetcher,
        {
            ...SWR_CONFIG.static,
            dedupingInterval: 300000, // Cache for 5 minutes
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    // Extract update_prompt_mode, default to 'prompt'
    const behavior = data?.data?.update_prompt_mode || 'prompt';

    return {
        behavior: behavior as 'auto' | 'prompt' | 'silent',
        isLoading,
        isError: !!error,
    };
}
