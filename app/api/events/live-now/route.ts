import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db, users, events, eventRsvps, eventHosts, eventCheckins } from '@/lib/db';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/events/live-now?privyId=X&date=YYYY-MM-DD
// The viewer's event happening on `date` (their device-local today — the
// client supplies it because the server can't know their timezone), where
// they're involved: checked in, hosting, or RSVP'd going. Powers the nav's
// "● LIVE" quick-access chip into Event Mode. Priority when multiple:
// checked-in > hosting > going.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const privyId = sp.get('privyId');
    const date = sp.get('date') ?? '';
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ event: null }, { headers: NO_STORE });

    const todays = await db
      .select({ id: events.id, slug: events.slug, eventName: events.eventName, startTime: events.startTime })
      .from(events)
      .where(and(eq(events.dateIso, date), eq(events.published, true)));
    if (todays.length === 0) return NextResponse.json({ event: null }, { headers: NO_STORE });

    const ids = todays.map((e) => e.id);
    const [checkins, hosting, rsvps] = await Promise.all([
      db.select({ eventId: eventCheckins.eventId }).from(eventCheckins)
        .where(and(eq(eventCheckins.userId, viewer.id), inArray(eventCheckins.eventId, ids))),
      db.select({ eventId: eventHosts.eventId }).from(eventHosts)
        .where(and(eq(eventHosts.userId, viewer.id), inArray(eventHosts.eventId, ids))),
      db.select({ eventId: eventRsvps.eventId }).from(eventRsvps)
        .where(and(eq(eventRsvps.userId, viewer.id), eq(eventRsvps.status, 'going'), inArray(eventRsvps.eventId, ids))),
    ]);
    const checkedIn = new Set(checkins.map((r) => r.eventId));
    const hosts = new Set(hosting.map((r) => r.eventId));
    const going = new Set(rsvps.map((r) => r.eventId));

    const pick =
      todays.find((e) => checkedIn.has(e.id)) ??
      todays.find((e) => hosts.has(e.id)) ??
      todays.find((e) => going.has(e.id)) ??
      null;

    return NextResponse.json(
      {
        event: pick
          ? { slug: pick.slug, eventName: pick.eventName, startTime: pick.startTime, checkedIn: checkedIn.has(pick.id), isHost: hosts.has(pick.id) }
          : null,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[live-now] GET failed:', error);
    return NextResponse.json({ error: 'Failed to check live events' }, { status: 500 });
  }
}
