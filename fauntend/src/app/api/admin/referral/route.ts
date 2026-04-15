import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase with service role key for admin operations
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface CreateReferralRequest {
  code: string;
  role?: 'user' | 'admin';
  max_uses?: number;
  expires_at?: string;
}

/**
 * POST /api/admin/referral
 * Create a new referral code
 *
 * Body:
 * {
 *   "code": "NAFIJ26",
 *   "role": "user",
 *   "max_uses": 0,  (0 = unlimited)
 *   "expires_at": "2025-12-31" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check for authorization using centralized auth
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (!adminPassword) {
      console.error('[Auth] ADMIN_PASSWORD not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    const providedPassword = authHeader.replace('Bearer ', '').trim();
    const isAuthorized = providedPassword === adminPassword;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body: CreateReferralRequest = await request.json();

    if (!body.code || body.code.length < 3) {
      return NextResponse.json(
        { error: 'Code must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from('special_referrals')
      .select('id')
      .eq('code', body.code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Referral code already exists' },
        { status: 409 }
      );
    }

    // Create referral code
    const { data, error } = await supabase
      .from('special_referrals')
      .insert({
        code: body.code.toUpperCase(),
        role: body.role || 'user',
        max_uses: body.max_uses ?? 0,
        current_uses: 0,
        is_active: true,
        expires_at: body.expires_at ? new Date(body.expires_at).toISOString() : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create referral code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Referral code "${body.code}" created successfully`,
      data: {
        code: data.code,
        role: data.role,
        max_uses: data.max_uses,
        expires_at: data.expires_at,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/referral?code=NAFIJ26
 * Get referral code info
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Code parameter required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('special_referrals')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: data.code,
        role: data.role,
        max_uses: data.max_uses,
        current_uses: data.current_uses,
        is_active: data.is_active,
        expires_at: data.expires_at,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
