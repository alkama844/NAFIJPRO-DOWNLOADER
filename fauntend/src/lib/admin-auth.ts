import { NextRequest } from 'next/server';

/**
 * Centralized admin password verification utility
 * Used across all admin API endpoints to ensure consistent authentication
 */
export function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminPassword) {
    console.error('[Auth] ADMIN_PASSWORD not configured in environment');
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const providedPassword = authHeader.replace('Bearer ', '').trim();

  return providedPassword === adminPassword;
}
