import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps, eventCheckins, tickets } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// The door roster: everyone admitted to the event — confirmed RSVPs plus
// ticket holders (a paid buyer may have no RSVP row). Deduped by userId.
async function loadRoster(eventId: string) {
  const rsvpRows = await db
    .select({
      userId: eventRsvps.userId,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(eventRsvps)
    .leftJoin(users, eq(eventRsvps.userId, users.id))
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'going')));

  const ticketRows = await db
    .select({
      userId: tickets.ownerId,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.ownerId, users.id))
    .where(and(eq(tickets.eventId, eventId), inArray(tickets.status, ['valid', 'checked_in'])));

  const byUser = new Map<string, { userId: string; name: string | null; username: string | null; avatarUrl: string | null }>();
  for (const r of [...rsvpRows, ...ticketRows]) {
    if (r.userId && !byUser.has(r.userId)) byUser.set(r.userId, r as { userId: string; name: string | null; username: string | null; avatarUrl: string | null });
  }
  return byUser;
}

// GET /api/events/checkin?eventId=X&privyId=Y — manager-only door view:
// the going roster with per-guest check-in state + live counts.
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const privyId = request.nextUrl.searchParams.get('privyId') ?? undefined;
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [roster, checkins] = await Promise.all([
      loadRoster(eventId),
      db
        .select({ userId: eventCheckins.userId, createdAt: eventCheckins.createdAt })
        .from(eventCheckins)
        .where(eq(eventCheckins.eventId, eventId)),
    ]);
    const checkedInAt = new Map(checkins.map((c) => [c.userId, c.createdAt]));

    const guests = Array.from(roster.values())
      .map((g) => ({ ...g, checkedInAt: checkedInAt.get(g.userId) ?? null }))
      .sort((a, b) => (a.name || a.username || '').localeCompare(b.name || b.username || ''));

    return NextResponse.json(
      { guests, goingCount: guests.length, checkedInCount: checkins.length },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[checkin] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load check-in roster' }, { status: 500 });
  }
}

// POST /api/events/checkin — { privyId, eventId, guestUserId }
// Manager marks a guest checked in. Idempotent: a second call reports the
// original check-in time instead of failing. Ticket holders also get their
// tickets stamped (status 'checked_in' + checkedInAt) so ticket reporting
// and the passport check-in stamp stay coherent.
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, guestUserId } = await request.json();
    if (!eventId || !guestUserId) {
      return NextResponse.json({ error: 'eventId and guestUserId are required' }, { status: 400 });
    }

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const roster = await loadRoster(eventId);
    if (!roster.has(guestUserId)) {
      return NextResponse.json({ error: 'Guest is not on the list for this event' }, { status: 404 });
    }

    const inserted = await db
      .insert(eventCheckins)
      .values({ eventId, userId: guestUserId, checkedInBy: auth.user.id })
      .onConflictDoNothing()
      .returning({ createdAt: eventCheckins.createdAt });

    if (inserted.length === 0) {
      const [existing] = await db
        .select({ createdAt: eventCheckins.createdAt })
        .from(eventCheckins)
        .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, guestUserId)))
        .limit(1);
      return NextResponse.json(
        { ok: true, already: true, checkedInAt: existing?.createdAt ?? null },
        { headers: NO_STORE },
      );
    }

    await db
      .update(tickets)
      .set({ status: 'checked_in', checkedInAt: new Date() })
      .where(and(eq(tickets.eventId, eventId), eq(tickets.ownerId, guestUserId), eq(tickets.status, 'valid')));

    return NextResponse.json(
      { ok: true, already: false, checkedInAt: inserted[0].createdAt },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[checkin] POST failed:', error);
    return NextResponse.json({ error: 'Failed to check guest in' }, { status: 500 });
  }
}

// DELETE /api/events/checkin?eventId=X&guestUserId=Y&privyId=Z — undo a
// check-in (mis-taps happen at a busy door). Reverts ticket stamps too.
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const eventId = sp.get('eventId');
    const guestUserId = sp.get('guestUserId');
    const privyId = sp.get('privyId') ?? undefined;
    if (!eventId || !guestUserId) {
      return NextResponse.json({ error: 'eventId and guestUserId are required' }, { status: 400 });
    }

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const deleted = await db
      .delete(eventCheckins)
      .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, guestUserId)))
      .returning({ id: eventCheckins.id });
    if (deleted.length === 0) return NextResponse.json({ error: 'Guest is not checked in' }, { status: 404 });

    await db
      .update(tickets)
      .set({ status: 'valid', checkedInAt: null })
      .where(and(eq(tickets.eventId, eventId), eq(tickets.ownerId, guestUserId), eq(tickets.status, 'checked_in')));

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[checkin] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to undo check-in' }, { status: 500 });
  }
}
