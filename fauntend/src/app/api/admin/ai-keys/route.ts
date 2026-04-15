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

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: keys, error } = await supabase
      .from('ai_keys')
      .select('id, label, provider, key, enabled, use_count, error_count, last_used_at, last_error, rate_limit_reset, created_at, updated_at');

    if (error) {
      console.error('[AI Keys] Query error:', error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!keys) {
      return NextResponse.json({
        keys: [],
        stats: {
          total: 0,
          enabled: 0,
          totalUses: 0,
          totalErrors: 0,
          byProvider: { groq: 0, gemini: 0, openai: 0, anthropic: 0, claude: 0, azure: 0, other: 0 },
        },
      });
    }

    const stats = {
      total: keys.length,
      enabled: keys.filter((k: any) => k.enabled).length,
      totalUses: keys.reduce((sum: number, k: any) => sum + (k.use_count || 0), 0),
      totalErrors: keys.reduce((sum: number, k: any) => sum + (k.error_count || 0), 0),
      byProvider: keys.reduce((acc: any, k: any) => {
        acc[k.provider] = (acc[k.provider] || 0) + 1;
        return acc;
      }, { groq: 0, gemini: 0, openai: 0, anthropic: 0, claude: 0, azure: 0, other: 0 }),
    };

    return NextResponse.json({ keys, stats });
  } catch (error) {
    console.error('[AI Keys] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, name, key, provider, label } = body;

    if (action === 'create' || !action) {
      if (!name && !label) {
        return NextResponse.json({ error: 'name/label and key are required' }, { status: 400 });
      }
      if (!key) {
        return NextResponse.json({ error: 'key is required' }, { status: 400 });
      }
      if (!provider) {
        return NextResponse.json({ error: 'provider is required' }, { status: 400 });
      }

      console.log(`[AI Keys] Creating new key for provider: ${provider}`);

      const keyLabel = name || label;
      const { data: newKey, error } = await supabase
        .from('ai_keys')
        .insert([{
          label: keyLabel,
          provider,
          key,
          enabled: true,
        }])
        .select('id, label, provider, key, enabled, use_count, error_count, last_used_at, last_error, rate_limit_reset, created_at, updated_at')
        .single();

      if (error) {
        console.error('[AI Keys] Create error:', error);
        return NextResponse.json({ error: `Failed to create key: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: newKey });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[AI Keys] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    console.log(`[AI Keys] Deleting key ${id}`);

    const { error } = await supabase
      .from('ai_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AI Keys] Delete error:', error);
      return NextResponse.json({ error: `Failed to delete key: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Key deleted successfully' });
  } catch (error) {
    console.error('[AI Keys] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
