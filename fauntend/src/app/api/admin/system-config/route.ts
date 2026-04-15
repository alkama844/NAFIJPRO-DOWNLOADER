import { NextRequest, NextResponse } from 'next/server';

function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return false;
  const authHeader = request.headers.get('authorization') || '';
  const providedPassword = authHeader.replace('Bearer ', '').trim();
  return providedPassword === adminPassword;
}

// In-memory state (will be replaced with database)
let config = {
  site_name: 'DownAria',
  site_description: 'Social Media Video Downloader',
  discord_webhook_url: '',
  maintenance_details: '',
  maintenance_estimated_end: '',
};

export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    data: config,
  });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  config = { ...config, ...body };
  return NextResponse.json({ success: true, message: 'Settings updated', data: config });
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  config = { ...config, ...body };
  return NextResponse.json({ success: true, message: 'Settings patched', data: config });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  config = {
    site_name: 'DownAria',
    site_description: 'Social Media Video Downloader',
    discord_webhook_url: '',
    maintenance_details: '',
    maintenance_estimated_end: '',
  };
  return NextResponse.json({ success: true, message: 'Settings reset to defaults' });
}

