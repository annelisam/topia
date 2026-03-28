import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps } from '@/lib/db';
import { eq, and, count } from 'drizzle-orm';

// GET /api/events/rsvps?eventId=X&privyId=Y — get RSVP info
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const privyId = request.nextUrl.searchParams.get('privyId');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // RSVP count
    const [countRow] = await db
      .select({ count: count() })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId));
    const rsvpCount = countRow?.count || 0;

    // Check if viewer has RSVP'd
    let userRsvped = false;
    if (privyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
      if (viewer) {
        const [rsvp] = await db.select({ id: eventRsvps.id }).from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, viewer.id)));
        userRsvped = !!rsvp;
      }
    }

    // RSVP list (names + avatars)
    const rsvps = await db
      .select({
        userId: eventRsvps.userId,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        createdAt: eventRsvps.createdAt,
      })
      .from(eventRsvps)
      .leftJoin(users, eq(eventRsvps.userId, users.id))
      .where(eq(eventRsvps.eventId, eventId));

    return NextResponse.json({ rsvps, rsvpCount, userRsvped });
  } catch (error) {
    console.error('GET event RSVPs:', error);
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 });
  }
}
