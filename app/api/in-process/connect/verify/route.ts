import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users, inProcessAccounts } from '@/lib/db';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured, loginWithOtp, mintArtistApiKey, encryptApiKey } from '@/lib/inProcessAccount';

// POST /api/in-process/connect/verify — { privyId, accessToken, email, code }
// Completes the connect: OTP → 1h JWT + artist address → mint a long-lived
// artist API key named for Topia → store it encrypted. The plaintext key
// exists only inside this request.
export async function POST(request: NextRequest) {
  try {
    const { privyId, accessToken, email, code } = await request.json();
    if (!email || !/^\d{6}$/.test(String(code ?? ''))) {
      return NextResponse.json({ error: 'The 6-digit code is required' }, { status: 400 });
    }
    if (!isInProcessWriteConfigured()) {
      return NextResponse.json({ error: 'In Process connection is not configured on this server' }, { status: 503 });
    }
    const [user] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.privyId, privyId ?? '')).limit(1);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const identity = await verifyPrivyIdentity(accessToken);
    if (identity.configured && (!identity.ok || identity.did !== privyId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    if (!identity.configured) console.warn('[in-process] PRIVY_APP_SECRET unset — connect not token-verified');

    const login = await loginWithOtp(String(email).trim().toLowerCase(), String(code));
    if ('error' in login) return NextResponse.json({ error: login.error }, { status: 400 });

    const keyName = `topia${user.username ? `-${user.username}` : ''}`;
    const apiKey = await mintArtistApiKey(login.token, keyName);
    if (!apiKey) {
      return NextResponse.json({ error: 'Signed in, but could not create an API key on In Process — try again' }, { status: 502 });
    }

    const encrypted = encryptApiKey(apiKey);
    await db.insert(inProcessAccounts)
      .values({ userId: user.id, artistAddress: login.artistAddress, apiKeyEncrypted: encrypted, keyName })
      .onConflictDoUpdate({
        target: inProcessAccounts.userId,
        set: { artistAddress: login.artistAddress, apiKeyEncrypted: encrypted, keyName, updatedAt: new Date() },
      });

    return NextResponse.json(
      { ok: true, artistAddress: login.artistAddress },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[in-process] connect verify failed:', error);
    return NextResponse.json({ error: 'Failed to complete connection' }, { status: 500 });
  }
}
