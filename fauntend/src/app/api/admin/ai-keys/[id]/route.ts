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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`[AI Keys] Updating key ${id}:`, body);

    const { data: updatedKey, error } = await supabase
      .from('ai_keys')
      .update(body)
      .eq('id', id)
      .select('id, label, provider, key, enabled, use_count, error_count, last_used_at, last_error, rate_limit_reset, created_at, updated_at')
      .single();

    if (error) {
      console.error('[AI Keys] Update error:', error);
      return NextResponse.json(
        { error: `Failed to update key: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updatedKey });
  } catch (error) {
    console.error('[AI Keys] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    console.log(`[AI Keys] Deleting key ${id}`);

    const { error } = await supabase
      .from('ai_keys')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AI Keys] Delete error:', error);
      return NextResponse.json(
        { error: `Failed to delete key: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Key deleted successfully',
    });
  } catch (error) {
    console.error('[AI Keys] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
