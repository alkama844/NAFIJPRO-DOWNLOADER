import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const DEFAULT_SYSTEM_CONFIG = {
  site_name: 'DownAria',
  site_description: 'Social Media Video Downloader',
  discord_webhook_url: '',
  maintenance_details: '',
  maintenance_estimated_end: '',
};

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

  try {
    if (!supabase) {
      console.error('[SystemConfig] Supabase client not initialized');
      return NextResponse.json({ success: true, data: DEFAULT_SYSTEM_CONFIG });
    }

    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('[SystemConfig] Database error:', error);
      // Fallback to default if not found
      return NextResponse.json({ success: true, data: DEFAULT_SYSTEM_CONFIG });
    }

    return NextResponse.json({ success: true, data: data || DEFAULT_SYSTEM_CONFIG });
  } catch (error) {
    console.error('[SystemConfig] GET error:', error);
    return NextResponse.json({ success: true, data: DEFAULT_SYSTEM_CONFIG });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!supabase) {
      console.error('[SystemConfig] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('system_config')
      .upsert({ id: 'default', ...body }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[SystemConfig] POST error:', error);
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings updated', data });
  } catch (error) {
    console.error('[SystemConfig] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!supabase) {
      console.error('[SystemConfig] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('system_config')
      .update(body)
      .eq('id', 'default')
      .select()
      .single();

    if (error) {
      console.error('[SystemConfig] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to patch config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings patched', data });
  } catch (error) {
    console.error('[SystemConfig] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    if (!supabase) {
      console.error('[SystemConfig] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { error } = await supabase
      .from('system_config')
      .update(DEFAULT_SYSTEM_CONFIG)
      .eq('id', 'default');

    if (error) {
      console.error('[SystemConfig] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to reset config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('[SystemConfig] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

