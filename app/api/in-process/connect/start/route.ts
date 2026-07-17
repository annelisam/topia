import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/lib/db';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured, sendOtpCode } from '@/lib/inProcessAccount';

// POST /api/in-process/connect/start — { privyId, accessToken, email }
// Kicks off "Sign in with In•Process": their side emails a 6-digit code.
export async function POST(request: NextRequest) {
  try {
    const { privyId, accessToken, email } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!isInProcessWriteConfigured()) {
      return NextResponse.json({ error: 'In Process connection is not configured on this server' }, { status: 503 });
    }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId ?? '')).limit(1);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const identity = await verifyPrivyIdentity(accessToken);
    if (identity.configured && (!identity.ok || identity.did !== privyId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    if (!identity.configured) console.warn('[in-process] PRIVY_APP_SECRET unset — connect not token-verified');

    const result = await sendOtpCode(String(email).trim().toLowerCase());
    if (!result.sent) {
      return NextResponse.json({ error: 'In Process could not send the code — try again shortly' }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[in-process] connect start failed:', error);
    return NextResponse.json({ error: 'Failed to start connection' }, { status: 500 });
  }
}
