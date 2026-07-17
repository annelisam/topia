import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users, inProcessAccounts } from '@/lib/db';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured } from '@/lib/inProcessAccount';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

async function resolveUser(privyId: string | null) {
  if (!privyId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  return user ?? null;
}

// GET /api/in-process/connect?privyId=X — the viewer's connection status.
// Never returns key material — only the artist address.
export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request.nextUrl.searchParams.get('privyId'));
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const [account] = await db
      .select({ artistAddress: inProcessAccounts.artistAddress, createdAt: inProcessAccounts.createdAt })
      .from(inProcessAccounts).where(eq(inProcessAccounts.userId, user.id)).limit(1);
    return NextResponse.json(
      { configured: isInProcessWriteConfigured(), connected: !!account, artistAddress: account?.artistAddress ?? null },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[in-process] connect GET failed:', error);
    return NextResponse.json({ error: 'Failed to load connection' }, { status: 500 });
  }
}

// DELETE /api/in-process/connect — disconnect (destroys our copy of the key;
// the key itself can also be revoked at inprocess.world/manage/api-keys).
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, accessToken } = await request.json().catch(() => ({}));
    const user = await resolveUser(privyId ?? null);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Identity-asserting operation: verify the bearer when Privy server auth
    // is configured; log loudly when it isn't (house pattern).
    const identity = await verifyPrivyIdentity(accessToken);
    if (identity.configured && (!identity.ok || identity.did !== privyId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    if (!identity.configured) console.warn('[in-process] PRIVY_APP_SECRET unset — disconnect not token-verified');

    await db.delete(inProcessAccounts).where(eq(inProcessAccounts.userId, user.id));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[in-process] disconnect failed:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
