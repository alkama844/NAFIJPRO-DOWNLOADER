import { NextRequest, NextResponse } from 'next/server';

function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return false;
  const authHeader = request.headers.get('authorization') || '';
  const providedPassword = authHeader.replace('Bearer ', '').trim();
  return providedPassword === adminPassword;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stats = searchParams.has('stats');

  if (stats) {
    // Return stats format
    return NextResponse.json([
      {
        platform: 'tiktok',
        tier: 'public',
        total: 0,
        enabled_count: 0,
        healthy_count: 0,
        cooldown_count: 0,
        expired_count: 0,
        disabled_count: 0,
        total_uses: 0,
        total_success: 0,
        total_errors: 0,
      }
    ]);
  }

  // Return cookies array format
  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  return NextResponse.json({ success: true, message: 'Cookie added', data: body });
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  return NextResponse.json({ success: true, message: 'Cookie updated', data: body });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  return NextResponse.json({ success: true, message: 'Cookies deleted' });
}
