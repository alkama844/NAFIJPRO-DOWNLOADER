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

  console.log('[Auth] Checking password...');
  console.log('[Auth] Admin password length:', adminPassword.length);
  console.log('[Auth] Provided password length:', providedPassword.length);
  console.log('[Auth] First 3 chars of admin password:', adminPassword.slice(0, 3));
  console.log('[Auth] First 3 chars of provided:', providedPassword.slice(0, 3));

  const isMatch = providedPassword === adminPassword;
  console.log('[Auth] Match result:', isMatch);

  if (!isMatch && process.env.NODE_ENV !== 'production') {
    console.log('[Auth] Password mismatch!');
    console.log('[Auth] Admin password bytes:', Buffer.from(adminPassword).toString('hex'));
    console.log('[Auth] Provided bytes:', Buffer.from(providedPassword).toString('hex'));
  }

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
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: 0,
        },
      });
    }

    console.log(`[Users] Fetched ${users.length} users, total: ${count}`);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
