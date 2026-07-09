import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventPrizes } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// GET /api/events/prizes?eventId=X — prize list for Event Mode (public to
// event viewers; winner shown by handle once drawn).
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const prizes = await db
      .select({
        id: eventPrizes.id,
        title: eventPrizes.title,
        description: eventPrizes.description,
        imageUrl: eventPrizes.imageUrl,
        drawnAt: eventPrizes.drawnAt,
        winnerName: users.name,
        winnerUsername: users.username,
        winnerAvatarUrl: users.avatarUrl,
      })
      .from(eventPrizes)
      .leftJoin(users, eq(eventPrizes.raffleWinnerUserId, users.id))
      .where(eq(eventPrizes.eventId, eventId))
      .orderBy(asc(eventPrizes.sortOrder), asc(eventPrizes.createdAt));

    return NextResponse.json({ prizes }, { headers: NO_STORE });
  } catch (error) {
    console.error('[prizes] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load prizes' }, { status: 500 });
  }
}

// POST /api/events/prizes — add a prize (managers).
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, title, description, imageUrl } = await request.json();
    if (!eventId || !title?.trim()) {
      return NextResponse.json({ error: 'eventId and title are required' }, { status: 400 });
    }
    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [prize] = await db.insert(eventPrizes).values({
      eventId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
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
