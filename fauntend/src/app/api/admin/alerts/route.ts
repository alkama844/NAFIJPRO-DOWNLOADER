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

const DEFAULT_ALERTS_CONFIG = {
  id: 'default',
  alertErrorSpike: true,
  alertCookieLow: true,
  alertPlatformDown: true,
  alertRateLimit: false,
  errorSpikeThreshold: 10,
  errorSpikeWindow: 60,
  cookieLowThreshold: 20,
  platformDownThreshold: 5,
  rateLimitThreshold: 100,
  cooldownMinutes: 30,
  lastAlertAt: null,
  lastAlertType: null,
  notifyEmail: false,
  notifyDiscord: false,
  discordWebhookUrl: null,
  emailRecipients: null,
  healthCheckEnabled: true,
  healthCheckInterval: 300,
  lastHealthCheckAt: null,
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
  return NextResponse.json({
    success: true,
    data: alertsConfig,
  });
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  alertsConfig = { ...alertsConfig, ...body };
  return NextResponse.json({ success: true, message: 'Alerts updated', data: alertsConfig });
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  alertsConfig = { ...alertsConfig, ...body };
  return NextResponse.json({ success: true, message: 'Alerts patched', data: alertsConfig });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const body = await request.json();
  const { action, webhookUrl } = body;

  if (action === 'test') {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '[Test] Admin webhook test from DownAria' }),
      });
      if (res.ok) {
        return NextResponse.json({ success: true, message: 'Webhook test successful' });
      } else {
        return NextResponse.json({ success: false, error: 'Webhook test failed' }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Webhook test error: ${error instanceof Error ? error.message : 'Unknown'}` },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true, message: 'Alert action completed', data: body });
}

