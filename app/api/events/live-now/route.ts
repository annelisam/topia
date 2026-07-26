import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db, users, events, eventRsvps, eventHosts, eventCheckins } from '@/lib/db';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/events/live-now?privyId=X&date=YYYY-MM-DD
// An event happening on `date` (the viewer's device-local today — the client
// supplies it because the server can't know their timezone). Powers the nav's
// "● LIVE" chips and the first-visit live takeover.
//
// Involvement priority when the viewer is part of one: checked-in > hosting >
// going. Viewers with no involvement (not RSVP'd, or logged out — privyId is
// optional) still get today's event back with involvement 'none', so the UI
// can pull them toward RSVPing instead of hiding the event from them.
//
// When several events share the day, native TOPIA events (created on the
// platform, externalSource null) outrank imported Luma/Partiful/etc. shares —
// both inside each involvement tier and in the no-involvement fallback. The
// old fallback was `todays[0]` in arbitrary DB order, which let a shared
// external listing steal the LIVE chip/takeover from a Topia event happening
// the same night.

/** "9:00 PM" → minutes since midnight, for a stable earliest-first ordering.
 * Unparseable/missing times sort last. */
function startMinutes(t: string | null): number {
  const m = (t ?? '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let h = Number(m[1]) % 12;
  if ((m[3] ?? '').toLowerCase() === 'pm') h += 12;
  return h * 60 + Number(m[2] ?? 0);
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const privyId = sp.get('privyId');
    const date = sp.get('date') ?? '';
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

    const todays = await db
      .select({ id: events.id, slug: events.slug, eventName: events.eventName, startTime: events.startTime, city: events.city, externalSource: events.externalSource })
      .from(events)
      .where(and(eq(events.dateIso, date), eq(events.published, true)));
    if (todays.length === 0) return NextResponse.json({ event: null }, { headers: NO_STORE });

    // TOPIA events first, then earliest start, then slug as a final
    // deterministic tie-break (never let the pick flip between requests).
    todays.sort((a, b) =>
      Number(!!a.externalSource) - Number(!!b.externalSource) ||
      startMinutes(a.startTime) - startMinutes(b.startTime) ||
      a.slug.localeCompare(b.slug));

    const ids = todays.map((e) => e.id);

    let checkedIn = new Set<string>();
    let hosts = new Set<string>();
    let going = new Set<string>();
    if (privyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
      if (viewer) {
        const [checkins, hosting, rsvps] = await Promise.all([
          db.select({ eventId: eventCheckins.eventId }).from(eventCheckins)
            .where(and(eq(eventCheckins.userId, viewer.id), inArray(eventCheckins.eventId, ids))),
          db.select({ eventId: eventHosts.eventId }).from(eventHosts)
            .where(and(eq(eventHosts.userId, viewer.id), inArray(eventHosts.eventId, ids))),
          db.select({ eventId: eventRsvps.eventId }).from(eventRsvps)
            .where(and(eq(eventRsvps.userId, viewer.id), eq(eventRsvps.status, 'going'), inArray(eventRsvps.eventId, ids))),
        ]);
        checkedIn = new Set(checkins.map((r) => r.eventId));
        hosts = new Set(hosting.map((r) => r.eventId));
        going = new Set(rsvps.map((r) => r.eventId));
      }
    }

    const pick =
      todays.find((e) => checkedIn.has(e.id)) ??
      todays.find((e) => hosts.has(e.id)) ??
      todays.find((e) => going.has(e.id)) ??
      todays[0];

    const involvement = checkedIn.has(pick.id) ? 'checkedin'
      : hosts.has(pick.id) ? 'host'
      : going.has(pick.id) ? 'going'
      : 'none';

    // Social proof for the takeover ("· 87 going").
    const [goingRow] = await db.select({ value: count() }).from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, pick.id), eq(eventRsvps.status, 'going')));

    return NextResponse.json(
      {
        event: {
          slug: pick.slug,
          eventName: pick.eventName,
          startTime: pick.startTime,
          city: pick.city,
          checkedIn: involvement === 'checkedin',
          isHost: involvement === 'host',
          involvement,
          goingCount: Number(goingRow?.value ?? 0),
        },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[live-now] GET failed:', error);
    return NextResponse.json({ error: 'Failed to check live events' }, { status: 500 });
  }
}
