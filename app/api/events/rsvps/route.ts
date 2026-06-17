import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps } from '@/lib/db';
import { eq, and, count } from 'drizzle-orm';

// GET /api/events/rsvps?eventId=X&privyId=Y — RSVP list + counts + answers.
// Used by the host Guests view (full list, statuses, answers) and to derive the
// viewer's own RSVP state.
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    // Per-status counts
    const counts = await db
      .select({ status: eventRsvps.status, value: count() })
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId))
      .groupBy(eventRsvps.status);
    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c.status] = c.value;
    const goingCount = byStatus['going'] || 0;
    const pendingCount = byStatus['pending'] || 0;

    // Viewer's own RSVP status
    let userRsvped = false;
    let userStatus: string | null = null;
    if (privyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
      if (viewer) {
        const [rsvp] = await db
          .select({ status: eventRsvps.status })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, viewer.id)));
        if (rsvp) { userRsvped = true; userStatus = rsvp.status; }
      }
    }

    // Full list with status + answers (host guest view).
    const rsvps = await db
      .select({
        userId: eventRsvps.userId,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        email: users.email,
        status: eventRsvps.status,
        responses: eventRsvps.responses,
        createdAt: eventRsvps.createdAt,
      })
      .from(eventRsvps)
      .leftJoin(users, eq(eventRsvps.userId, users.id))
      .where(eq(eventRsvps.eventId, eventId));

    return NextResponse.json({
      rsvps,
      rsvpCount: goingCount,     // public "going" number
      goingCount,
      pendingCount,
      userRsvped,
      userStatus,
    });
  } catch (error) {
    console.error('GET event RSVPs:', error);
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 });
  }
}
