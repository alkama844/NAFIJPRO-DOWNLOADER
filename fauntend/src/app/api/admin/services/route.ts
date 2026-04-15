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

const DEFAULT_SERVICE_CONFIG = {
  platforms: {},
  globalRateLimit: 100,
  playgroundRateLimit: 50,
  playgroundEnabled: true,
  geminiRateLimit: 60,
  geminiRateWindow: 60,
  maintenanceMode: false,
  maintenanceType: 'off' as const,
  maintenanceMessage: '',
  apiKeyRequired: false,
  lastUpdated: new Date().toISOString(),
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
      console.error('[Services] Supabase client not initialized');
      return NextResponse.json({ success: true, data: DEFAULT_SERVICE_CONFIG });
    }

    const { data, error } = await supabase
      .from('service_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      console.error('[Services] Database error:', error);
      // Fallback to default if not found
      return NextResponse.json({ success: true, data: DEFAULT_SERVICE_CONFIG });
    }

    return NextResponse.json({ success: true, data: data || DEFAULT_SERVICE_CONFIG });
  } catch (error) {
    console.error('[Services] GET error:', error);
    return NextResponse.json({ success: true, data: DEFAULT_SERVICE_CONFIG });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, platformId, enabled, updates, message } = body;

    if (!supabase) {
      console.error('[Services] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    if (action === 'updatePlatform') {
      // Get current config
      const { data: currentConfig, error: getError } = await supabase
        .from('service_config')
        .select('*')
        .eq('id', 'default')
        .single();

      if (getError && getError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[Services] GET error:', getError);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
      }

      const platforms = currentConfig?.platforms || {};
      if (!platforms[platformId]) {
        platforms[platformId] = {
          id: platformId,
          name: platformId,
          enabled: true,
          method: 'GET',
          rateLimit: 100,
          cacheTime: 300,
          disabledMessage: '',
          lastUpdated: new Date().toISOString(),
          stats: {
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            avgResponseTime: 0,
          },
          ...updates,
        };
      } else {
        platforms[platformId] = {
          ...platforms[platformId],
          enabled: enabled !== undefined ? enabled : platforms[platformId].enabled,
          ...updates,
          lastUpdated: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('service_config')
        .upsert({ id: 'default', platforms, lastUpdated: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Services] Upsert error:', error);
        return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: platforms[platformId] });
    }

    if (action === 'updateGlobal') {
      const { data, error } = await supabase
        .from('service_config')
        .upsert({ id: 'default', ...body, lastUpdated: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Services] Upsert error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    if (action === 'resetStats') {
      const { data: currentConfig, error: getError } = await supabase
        .from('service_config')
        .select('*')
        .eq('id', 'default')
        .single();

      if (getError && getError.code !== 'PGRST116') {
        console.error('[Services] GET error:', getError);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
      }

      const platforms = currentConfig?.platforms || {};
      if (platformId && platforms[platformId]) {
        platforms[platformId].stats = {
          totalRequests: 0,
          successCount: 0,
          errorCount: 0,
          avgResponseTime: 0,
        };
      } else {
        Object.keys(platforms).forEach(key => {
          platforms[key].stats = {
            totalRequests: 0,
            successCount: 0,
            errorCount: 0,
            avgResponseTime: 0,
          };
        });
      }

      const { error: updateError } = await supabase
        .from('service_config')
        .update({ platforms })
        .eq('id', 'default');

      if (updateError) {
        console.error('[Services] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to reset stats' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Stats reset' });
    }

    return NextResponse.json({ success: true, message: 'Services updated', data: body });
  } catch (error) {
    console.error('[Services] POST error:', error);
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
      console.error('[Services] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('service_config')
      .update({ ...body, lastUpdated: new Date().toISOString() })
      .eq('id', 'default')
      .select()
      .single();

    if (error) {
      console.error('[Services] PATCH error:', error);
      return NextResponse.json({ error: 'Failed to patch config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Services patched', data });
  } catch (error) {
    console.error('[Services] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!supabase) {
      console.error('[Services] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('service_config')
      .upsert({ id: 'default', ...body, lastUpdated: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Services] PUT error:', error);
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Services updated', data });
  } catch (error) {
    console.error('[Services] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  try {
    if (!supabase) {
      console.error('[Services] Supabase client not initialized');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { error } = await supabase
      .from('service_config')
      .update(DEFAULT_SERVICE_CONFIG)
      .eq('id', 'default');

    if (error) {
      console.error('[Services] DELETE error:', error);
      return NextResponse.json({ error: 'Failed to reset config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Services reset to defaults' });
  } catch (error) {
    console.error('[Services] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

