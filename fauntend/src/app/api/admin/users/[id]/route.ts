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

/**
 * Verify admin password from Authorization header
 */
function verifyAdminPassword(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminPassword) {
    console.error('[Auth] ADMIN_PASSWORD not configured in environment');
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const providedPassword = authHeader.replace('Bearer ', '').trim();

  return providedPassword === adminPassword;
}

/**
 * PATCH /api/admin/users/[id]
 * Update user details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();

    console.log(`[Users] Updating user ${id}:`, body);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', id)
      .select('id, email, username, role, created_at, is_banned, ban_reason')
      .single();

    if (error) {
      console.error('[Users] Update error:', error);
      return NextResponse.json(
        { error: `Failed to update user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;

    console.log(`[Users] Deleting user ${id}`);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Users] Delete error:', error);
      return NextResponse.json(
        { error: `Failed to delete user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
