import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, users, events, eventHosts } from '@/lib/db';

// POST /api/events/settings — host updates RSVP/registration settings.
// Body: { privyId, eventId, rsvpCapacity?, rsvpApprovalRequired?, rsvpClosed? }
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [host] = await db
      .select({ id: eventHosts.id })
      .from(eventHosts)
      .where(and(eq(eventHosts.eventId, data.eventId), eq(eventHosts.userId, user.id)));
    if (!host) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const patch: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
    if (data.rsvpCapacity !== undefined) {
      patch.rsvpCapacity =
        data.rsvpCapacity === null || data.rsvpCapacity === '' ? null : Math.max(0, Math.round(Number(data.rsvpCapacity)));
    }
    if (data.rsvpApprovalRequired !== undefined) patch.rsvpApprovalRequired = Boolean(data.rsvpApprovalRequired);
    if (data.rsvpClosed !== undefined) patch.rsvpClosed = Boolean(data.rsvpClosed);

    const [updated] = await db
      .update(events)
      .set(patch)
      .where(eq(events.id, data.eventId))
      .returning({
        rsvpCapacity: events.rsvpCapacity,
        rsvpApprovalRequired: events.rsvpApprovalRequired,
        rsvpClosed: events.rsvpClosed,
      });

    return NextResponse.json({ ok: true, settings: updated });
  } catch (error) {
    console.error('POST event settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
