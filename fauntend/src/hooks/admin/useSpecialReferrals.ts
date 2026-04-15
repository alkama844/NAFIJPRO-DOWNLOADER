'use client';

import { useState, useCallback } from 'react';
import { useAdminFetch, getAdminHeaders } from './useAdminFetch';
import { API_URL } from '@/lib/config';
import Swal from 'sweetalert2';

export interface SpecialReferral {
    id: string;
    code: string;
    role: 'user' | 'admin';
    max_uses: number;
    current_uses: number;
    is_active: boolean;
    Note: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface CreateReferralData {
    code?: string;
    role: 'user' | 'admin';
    max_uses: number;
    note?: string;
    expires_at?: string;
}

const toast = (icon: 'success' | 'error', title: string) => {
    Swal.fire({ 
        toast: true, 
        position: 'top-end', 
        icon, 
        title, 
        showConfirmButton: false, 
        timer: 2000, 
        background: 'var(--bg-card)', 
        color: 'var(--text-primary)' 
    });
};

export function useSpecialReferrals() {
    const [saving, setSaving] = useState(false);
    
    const { data, loading, error, refetch, mutate } = useAdminFetch<SpecialReferral[]>('/api/admin/referrals');

    const createReferral = useCallback(async (referralData: CreateReferralData): Promise<SpecialReferral | null> => {
        setSaving(true);
        try {
            const headers = getAdminHeaders();

            const res = await fetch(`/api/admin/referrals`, {
                method: 'POST',
                headers,
                body: JSON.stringify(referralData)
            });

            const json = await res.json();

            if (json.success) {
                toast('success', 'Referral code created');
                refetch();
                return json.data;
            } else {
                toast('error', json.error || 'Failed to create');
                return null;
            }
        } catch {
            toast('error', 'Connection error');
            return null;
        } finally {
            setSaving(false);
        }
    }, [refetch]);


    const updateReferral = useCallback(async (id: string, updates: Partial<SpecialReferral>): Promise<boolean> => {
        setSaving(true);
        try {
            const headers = getAdminHeaders();

            const res = await fetch(`/api/admin/referrals/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updates)
            });

            const json = await res.json();

            if (json.success) {
                toast('success', 'Referral updated');
                refetch();
                return true;
            } else {
                toast('error', json.error || 'Failed to update');
                return false;
            }
        } catch {
            toast('error', 'Connection error');
            return false;
        } finally {
            setSaving(false);
        }
    }, [refetch]);

    const deleteReferral = useCallback(async (id: string): Promise<boolean> => {
        const confirm = await Swal.fire({
            title: 'Delete referral code?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#ef4444',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });

        if (!confirm.isConfirmed) return false;

        setSaving(true);
        try {
            const headers = getAdminHeaders();

            const res = await fetch(`/api/admin/referrals?id=${id}`, {
                method: 'DELETE',
                headers
            });

            const json = await res.json();

            if (json.success) {
                toast('success', 'Referral deleted');
                refetch();
                return true;
            } else {
                toast('error', json.error || 'Failed to delete');
                return false;
            }
        } catch {
            toast('error', 'Connection error');
            return false;
        } finally {
            setSaving(false);
        }
    }, [refetch]);

    const toggleActive = useCallback(async (id: string, is_active: boolean): Promise<boolean> => {
        return updateReferral(id, { is_active });
    }, [updateReferral]);

    const copyCode = useCallback((code: string) => {
        navigator.clipboard.writeText(code);
        toast('success', 'Code copied!');
    }, []);

    return {
        referrals: data || [],
        loading,
        error,
        saving,
        refetch,
        mutate,
        createReferral,
        updateReferral,
        deleteReferral,
        toggleActive,
        copyCode
    };
}
