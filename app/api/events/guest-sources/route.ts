import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, isNotNull, ne, or } from 'drizzle-orm';
import { db, users, events, eventHosts, eventRsvps } from '@/lib/db';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// GET /api/events/guest-sources?privyId=X&excludeEventId=Y
// The events this viewer manages (creator or manager co-host), newest first —
// the source list for "invite guests from a past event". Names/dates only;
// actual guest CONTACTS come from the per-event rsvps endpoint, which is
// requireManager-gated per source event.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const privyId = sp.get('privyId');
    const excludeEventId = sp.get('excludeEventId');
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const rows = await db
      .selectDistinct({ id: events.id, eventName: events.eventName, date: events.date, dateIso: events.dateIso })
      .from(events)
      .leftJoin(eventHosts, and(
        eq(eventHosts.eventId, events.id),
        eq(eventHosts.userId, viewer.id),
        eq(eventHosts.manager, true),
      ))
      .where(and(
        or(eq(events.createdBy, viewer.id), isNotNull(eventHosts.id)),
        ...(excludeEventId ? [ne(events.id, excludeEventId)] : []),
      ))
      .orderBy(desc(events.dateIso))
      .limit(50);

    // Going counts for the dropdown labels.
    const counts = new Map<string, number>();
    if (rows.length) {
      const rsvps = await db
        .select({ eventId: eventRsvps.eventId })
        .from(eventRsvps)
        .where(and(inArray(eventRsvps.eventId, rows.map((r) => r.id)), eq(eventRsvps.status, 'going')));
      for (const r of rsvps) counts.set(r.eventId, (counts.get(r.eventId) ?? 0) + 1);
    }

    return NextResponse.json(
      { events: rows.map((r) => ({ ...r, going: counts.get(r.id) ?? 0 })) },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[guest-sources] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load your events' }, { status: 500 });
  }
}
