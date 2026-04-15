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

  const isMatch = providedPassword === adminPassword;

  return isMatch;
}

/**
 * GET /api/admin/users
 * List all users with pagination
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!supabase) {
      console.error('Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log(`[Users] Fetching page ${page}, limit ${limit}, offset ${offset}`);

    // Use RLS bypass with service role key
    const { data: users, error, count } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at, is_banned, ban_reason', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Users] Query error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!users) {
      console.warn('[Users] No users returned');
      return NextResponse.json({
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    console.log(`[Users] Fetched ${users.length} users, total: ${count}`);

    return NextResponse.json({
      users: users,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
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
 * POST /api/admin/users
 * Create a new user or perform user actions (updateRole, updateStatus)
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!supabase) {
      console.error('Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, userId, email, role = 'user', password, status } = body;

    // Handle action-based operations
    if (action === 'updateRole') {
      if (!userId || !role) {
        return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
      }
      console.log(`[Users] Updating role for user ${userId} to ${role}`);

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select('id, email, username, role, created_at, is_banned, ban_reason')
        .single();

      if (error) {
        console.error('[Users] Update error:', error);
        return NextResponse.json({ error: `Failed to update role: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: updatedUser });
    }

    if (action === 'updateStatus') {
      if (!userId || !status) {
        return NextResponse.json({ error: 'userId and status are required' }, { status: 400 });
      }
      console.log(`[Users] Updating status for user ${userId} to ${status}`);

      const isBanned = status === 'banned';
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ is_banned: isBanned })
        .eq('id', userId)
        .select('id, email, username, role, created_at, is_banned, ban_reason')
        .single();

      if (error) {
        console.error('[Users] Update error:', error);
        return NextResponse.json({ error: `Failed to update status: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: updatedUser });
    }

    // Handle create action
    if (action === 'create' || !action) {
      if (!email || !email.trim()) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      console.log(`[Users] Creating new user: ${email} with role: ${role}`);

      // Generate temporary password if not provided
      const userPassword = password || Math.random().toString(36).slice(-12) + 'Aa1!';

      // Create auth user first (this generates the UUID)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: userPassword,
        user_metadata: {
          username: email.split('@')[0],
          role: role || 'user',
        },
      });

      if (authError || !authData.user) {
        console.error('[Users] Auth creation error:', authError);
        return NextResponse.json(
          { error: `Failed to create auth user: ${authError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      console.log(`[Users] Auth user created: ${authData.user.id}`);

      // Fetch the user record from public.users (trigger should have created it)
      const { data: newUser, error: fetchError } = await supabase
        .from('users')
        .select('id, email, username, role, created_at, is_banned, ban_reason')
        .eq('id', authData.user.id)
        .single();

      if (fetchError || !newUser) {
        console.error('[Users] Failed to fetch created user:', fetchError);
        return NextResponse.json(
          { error: `User created but failed to fetch: ${fetchError?.message || 'Unknown error'}` },
          { status: 500 }
        );
      }

      console.log(`[Users] User created successfully: ${email}`);

      return NextResponse.json({ success: true, data: newUser });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user by userId in body
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminPassword(request)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log(`[Users] Deleting user ${userId}`);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

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
