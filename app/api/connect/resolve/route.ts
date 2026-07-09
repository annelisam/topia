import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { resolveConnectCode, extractConnectCode } from '@/lib/connect/code';

// GET /api/connect/resolve?code=X — whose code is this? Public card data
// only (a code is an unguessable capability, so resolving it reveals the
// same info the person's public profile does).
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('code');
    const parsed = raw ? extractConnectCode(raw) : null;
    const userId = parsed ? await resolveConnectCode(parsed) : null;
    if (!userId) return NextResponse.json({ error: 'Unknown code' }, { status: 404 });

    const [u] = await db
      .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, bio: users.bio })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return NextResponse.json({ error: 'Unknown code' }, { status: 404 });

    return NextResponse.json(
      { userId: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl, bio: u.bio },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[connect] resolve failed:', error);
    return NextResponse.json({ error: 'Failed to resolve code' }, { status: 500 });
  }
}
