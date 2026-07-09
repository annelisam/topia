import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { resolveConnectCode, extractConnectCode } from '@/lib/connect/code';
import { createConnection, listConnections } from '@/lib/connect/connections';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// POST /api/connect — { privyId, code, eventId? }
// Redeem a scanned Topia code: mutual follow + "met at" context row.
// Returns the other person so the scanner can show who you just met.
export async function POST(request: NextRequest) {
  try {
    const { privyId, code, eventId } = await request.json();
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const parsed = extractConnectCode(String(code));
    const targetId = parsed ? await resolveConnectCode(parsed) : null;
    if (!targetId) return NextResponse.json({ error: "That QR isn't a Topia code" }, { status: 404 });
    if (targetId === viewer.id) {
      return NextResponse.json({ error: "That's your own code" }, { status: 400 });
    }

    const [target] = await db
      .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { alreadyConnected } = await createConnection(viewer.id, targetId, eventId ?? null);

    return NextResponse.json(
      { ok: true, already: alreadyConnected, target: { name: target.name, username: target.username, avatarUrl: target.avatarUrl } },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[connect] POST failed:', error);
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 });
  }
}

// GET /api/connect?privyId=X[&eventId=Y] — the viewer's connections
// (people they've met), optionally scoped to one event.
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const connections = await listConnections(viewer.id, eventId ?? null);
    return NextResponse.json({ connections, count: connections.length }, { headers: NO_STORE });
  } catch (error) {
    console.error('[connect] GET list failed:', error);
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
  }
}
