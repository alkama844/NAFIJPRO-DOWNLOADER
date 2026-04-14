import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/debug
 * Debug endpoint to check admin password configuration
 * WARNING: Only use for debugging - remove in production!
 */
export async function GET(request: NextRequest) {
  // Only allow from localhost or provide a debug token
  const debugToken = request.nextUrl.searchParams.get('token');

  if (debugToken !== process.env.DEBUG_TOKEN && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  return NextResponse.json({
    debug: {
      adminPasswordSet: !!adminPassword,
      adminPasswordLength: adminPassword?.length || 0,
      adminPasswordTrimmedLength: adminPassword?.trim().length || 0,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    warning: '⚠️ This endpoint is for debugging only - remove in production!',
  });
}
