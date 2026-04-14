import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify admin password
 */
function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return false;
  return password.trim() === adminPassword;
}

/**
 * POST /api/admin/session
 * Create admin session and return token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create a session token (in production, you'd use a real JWT or session library)
    const token = Buffer.from(`admin_${Date.now()}_${Math.random().toString(36).slice(2)}`).toString('base64');

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      token,
      message: 'Admin session created',
    });

    // Set HttpOnly, Secure, SameSite cookie
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 7, // 7 days
      path: '/admin',
    });

    return response;
  } catch (error) {
    console.error('[Admin Session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/session
 * Check if admin session is valid
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // In production, validate the token properly
    return NextResponse.json({
      authenticated: true,
      message: 'Admin session valid',
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
