import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps, eventCheckins } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';
import { getEventQuestProgress } from '@/lib/events/quests';

// GET /api/events/quests/progress?eventId=X&privyId=Y — the progress board:
// who's completed how many quests, raffle-entered flags. Attendee-visible by
// product decision, but scoped: viewer must be a manager, a going guest, or
// checked in — not the open internet.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const eventId = sp.get('eventId');
    const privyId = sp.get('privyId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) {
      const [[rsvp], [checkin]] = await Promise.all([
        db.select({ status: eventRsvps.status }).from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, viewer.id))).limit(1),
        db.select({ id: eventCheckins.id }).from(eventCheckins)
          .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, viewer.id))).limit(1),
      ]);
      if (rsvp?.status !== 'going' && !checkin) {
        return NextResponse.json({ error: 'Only guests of this event can see the progress board' }, { status: 403 });
      }
    }

    const progress = await getEventQuestProgress(eventId);
    return NextResponse.json(progress, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[quests] progress failed:', error);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
