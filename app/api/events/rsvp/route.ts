import { NextRequest, NextResponse } from 'next/server';
import { db, users, events, eventRsvps, eventHosts, notifications } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// POST /api/events/rsvp — RSVP to an event
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId } = await request.json();

    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    // Resolve user
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already RSVP'd
    const [existing] = await db.select({ id: eventRsvps.id }).from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, user.id)));
    if (existing) {
      return NextResponse.json({ error: 'Already RSVP\'d' }, { status: 409 });
    }

    // Create RSVP
    const [rsvp] = await db.insert(eventRsvps).values({
      eventId,
      userId: user.id,
      status: 'going',
    }).returning();

    // Get event details for notification
    const [event] = await db.select({
      eventName: events.eventName,
      slug: events.slug,
    }).from(events).where(eq(events.id, eventId));

    // Notify all hosts
    if (event) {
      const hosts = await db.select({ userId: eventHosts.userId }).from(eventHosts)
        .where(eq(eventHosts.eventId, eventId));

      for (const host of hosts) {
        if (host.userId !== user.id) {
          await db.insert(notifications).values({
            recipientId: host.userId,
            actorId: user.id,
            type: 'event_rsvp',
            metadata: {
              eventId,
              eventName: event.eventName,
              eventSlug: event.slug,
            },
          });
        }
      }
    }

    return NextResponse.json({ rsvp }, { status: 201 });
  } catch (error) {
    console.error('POST event RSVP:', error);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}

// DELETE /api/events/rsvp — remove RSVP
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, eventId } = await request.json();

    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.delete(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE event RSVP:', error);
    return NextResponse.json({ error: 'Failed to remove RSVP' }, { status: 500 });
  }
}
