import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/admin-auth';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || '';

async function proxyToBackend(path: string, init: RequestInit) {
  const url = `${BACKEND}${path}`;
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return new NextResponse(JSON.stringify(json), { status: res.status });
  } catch (e) {
    return new NextResponse(text, { status: res.status });
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!BACKEND) return NextResponse.json({ success: false, error: 'Backend not configured' }, { status: 500 });

  return proxyToBackend('/api/admin/api-keys', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!BACKEND) return NextResponse.json({ success: false, error: 'Backend not configured' }, { status: 500 });

  const bodyText = await request.text();
  // If action=regenerate, proxy to regenerate path on backend
  try {
    const parsed = JSON.parse(bodyText || '{}');
    if (parsed && parsed.action === 'regenerate') {
      return proxyToBackend('/api/admin/api-keys/regenerate', { method: 'POST', body: bodyText, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    // ignore parse errors and forward as normal
  }

  return proxyToBackend('/api/admin/api-keys', { method: 'POST', body: bodyText, headers: { 'Content-Type': 'application/json' } });
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!BACKEND) return NextResponse.json({ success: false, error: 'Backend not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

  return proxyToBackend(`/api/admin/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
