import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getOrCreateConnectCode } from '@/lib/connect/code';

// GET /api/connect/code?privyId=X — the viewer's own connect code (lazily
// minted). Encoded into their QR in Event Mode; identification only, since
// it returns nothing but the viewer's own token.
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const code = await getOrCreateConnectCode(viewer.id);
    return NextResponse.json(
      { code, path: `/connect/${code}` },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[connect] GET code failed:', error);
    return NextResponse.json({ error: 'Failed to load connect code' }, { status: 500 });
  }
}
