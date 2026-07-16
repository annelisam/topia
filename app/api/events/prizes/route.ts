import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventPrizes, eventCheckins } from '@/lib/db';
import { asc, count, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const PRIZE_KINDS = new Set(['raffle', 'everyone', 'first_n']);

// GET /api/events/prizes?eventId=X — prize list for Event Mode (public to
// event viewers; winner shown by handle once drawn). Includes the event's
// checked-in count so first-N prizes can show spots left.
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const [prizes, [checkins]] = await Promise.all([
      db
        .select({
          id: eventPrizes.id,
          title: eventPrizes.title,
          description: eventPrizes.description,
          imageUrl: eventPrizes.imageUrl,
          kind: eventPrizes.kind,
          threshold: eventPrizes.threshold,
          drawnAt: eventPrizes.drawnAt,
          winnerName: users.name,
          winnerUsername: users.username,
          winnerAvatarUrl: users.avatarUrl,
        })
        .from(eventPrizes)
        .leftJoin(users, eq(eventPrizes.raffleWinnerUserId, users.id))
        .where(eq(eventPrizes.eventId, eventId))
        .orderBy(asc(eventPrizes.sortOrder), asc(eventPrizes.createdAt)),
      db.select({ value: count() }).from(eventCheckins).where(eq(eventCheckins.eventId, eventId)),
    ]);

    return NextResponse.json({ prizes, checkedInCount: Number(checkins?.value ?? 0) }, { headers: NO_STORE });
  } catch (error) {
    console.error('[prizes] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load prizes' }, { status: 500 });
  }
}

// POST /api/events/prizes — add a prize (managers).
// kind: 'raffle' (default) | 'everyone' | 'first_n' (+ threshold ≥ 1).
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, title, description, imageUrl, kind, threshold } = await request.json();
    if (!eventId || !title?.trim()) {
      return NextResponse.json({ error: 'eventId and title are required' }, { status: 400 });
    }
    const cleanKind = String(kind || 'raffle');
    if (!PRIZE_KINDS.has(cleanKind)) {
      return NextResponse.json({ error: 'kind must be raffle, everyone, or first_n' }, { status: 400 });
    }
    let cleanThreshold: number | null = null;
    if (cleanKind === 'first_n') {
      const n = Math.floor(Number(threshold));
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: 'first_n prizes need a threshold of at least 1' }, { status: 400 });
      }
      cleanThreshold = n;
    }

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [prize] = await db.insert(eventPrizes).values({
      eventId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      kind: cleanKind,
      threshold: cleanThreshold,
    }).returning();
    return NextResponse.json({ prize }, { headers: NO_STORE });
  } catch (error) {
    console.error('[prizes] POST failed:', error);
    return NextResponse.json({ error: 'Failed to add prize' }, { status: 500 });
  }
}

// DELETE /api/events/prizes?id=X&privyId=Y
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const privyId = sp.get('privyId') ?? undefined;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const [prize] = await db.select({ eventId: eventPrizes.eventId }).from(eventPrizes).where(eq(eventPrizes.id, id)).limit(1);
    if (!prize) return NextResponse.json({ error: 'Prize not found' }, { status: 404 });

    const auth = await requireManager(privyId, prize.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.delete(eventPrizes).where(eq(eventPrizes.id, id));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[prizes] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete prize' }, { status: 500 });
  }
}
