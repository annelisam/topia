import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, events, eventHosts, eventRsvps } from '@/lib/db/schema';
import { eq, and, gte, or, isNotNull, asc } from 'drizzle-orm';

interface UpcomingEvent {
  id: string;
  eventName: string;
  slug: string;
  dateIso: string | null;
  date: string | null;
  startTime: string | null;
  city: string | null;
  imageUrl: string | null;
  role: 'hosting' | 'attending';
}

/**
 * GET /api/dashboard/upcoming?privyId=...
 * Returns events the user is hosting OR has RSVP'd to whose dateIso is today
 * or later. Sorted chronologically, max 6.
 */
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!privyId) return NextResponse.json({ events: [] });

  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ events: [] });

    const todayIso = new Date().toISOString().slice(0, 10);

    // Events I host (via eventHosts table OR created_by)
    const hosting = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        slug: events.slug,
        dateIso: events.dateIso,
        date: events.date,
        startTime: events.startTime,
        city: events.city,
        imageUrl: events.imageUrl,
      })
      .from(events)
      .leftJoin(eventHosts, eq(events.id, eventHosts.eventId))
      .where(and(
        or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id)),
        isNotNull(events.dateIso),
        gte(events.dateIso, todayIso),
        eq(events.published, true),
      ))
      .orderBy(asc(events.dateIso))
      .limit(20);

    // Events I've RSVP'd to
    const attending = await db
      .select({
        id: events.id,
        eventName: events.eventName,
        slug: events.slug,
        dateIso: events.dateIso,
        date: events.date,
        startTime: events.startTime,
        city: events.city,
        imageUrl: events.imageUrl,
      })
      .from(events)
      .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(and(
        eq(eventRsvps.userId, user.id),
        isNotNull(events.dateIso),
        gte(events.dateIso, todayIso),
        eq(events.published, true),
      ))
      .orderBy(asc(events.dateIso))
      .limit(20);

    // Merge + dedupe by id, prefer "hosting" role over "attending"
    const map = new Map<string, UpcomingEvent>();
    for (const e of hosting) map.set(e.id, { ...e, role: 'hosting' });
    for (const e of attending) {
      if (!map.has(e.id)) map.set(e.id, { ...e, role: 'attending' });
    }

    const list = [...map.values()]
      .sort((a, b) => (a.dateIso ?? '').localeCompare(b.dateIso ?? ''))
      .slice(0, 6);

    return NextResponse.json({ events: list });
  } catch (error) {
    console.error('Upcoming events error:', error);
    return NextResponse.json({ events: [] });
  }
}
