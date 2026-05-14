import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdminPassword } from '@/lib/admin-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  try {
    const { data, error } = await supabase.from('api_keys').select('id, key_preview, name, enabled, rate_limit_per_minute, last_used_at, created_at, expire_at').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ success: false, error: `DB: ${error.message}` }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  try {
    const body = await request.json();
    if (!body?.name) return NextResponse.json({ success: false, error: 'Missing name' }, { status: 400 });

    const rawKey = 'nak_' + crypto.randomBytes(24).toString('hex');
    const preview = `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`;
    const row = {
      key_preview: preview,
      name: body.name,
      rate_limit_per_minute: body.rateLimit ?? 60,
      enabled: body.enabled ?? true,
      expire_at: body.expireAt ?? null,
    };

    const { data, error } = await supabase.from('api_keys').insert(row).select('*').single();
    if (error) return NextResponse.json({ success: false, error: `DB: ${error.message}` }, { status: 500 });

    return NextResponse.json({ success: true, data: { ...data, key: rawKey } });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const { error } = await supabase.from('api_keys').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ success: false, error: `DB: ${error.message}` }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Internal error: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 500 });
  }
}
