import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventHosts, eventHostInvitations, events, notifications } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// POST /api/events/hosts/respond — accept or decline co-host invitation
export async function POST(request: NextRequest) {
  try {
    const { privyId, invitationId, action } = await request.json();

    if (!privyId || !invitationId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // Resolve user
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the invitation
    const [invitation] = await db.select().from(eventHostInvitations)
      .where(and(eq(eventHostInvitations.id, invitationId), eq(eventHostInvitations.inviteeId, user.id)));
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already responded to' }, { status: 409 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    // Update invitation
    await db.update(eventHostInvitations)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(eventHostInvitations.id, invitationId));

    // Get event for notifications
    const [event] = await db.select({
      eventName: events.eventName,
      slug: events.slug,
    }).from(events).where(eq(events.id, invitation.eventId));

    if (action === 'accept') {
      // Add as host
      await db.insert(eventHosts).values({
        eventId: invitation.eventId,
        userId: user.id,
        role: 'co_host',
      });

      // Notify the inviter
      if (event) {
        await db.insert(notifications).values({
          recipientId: invitation.inviterId,
          actorId: user.id,
          type: 'event_cohost_accepted',
          metadata: {
            eventId: invitation.eventId,
            eventName: event.eventName,
            eventSlug: event.slug,
          },
        });
      }
    } else {
      // Notify the inviter about decline
      if (event) {
        await db.insert(notifications).values({
          recipientId: invitation.inviterId,
          actorId: user.id,
          type: 'event_cohost_declined',
          metadata: {
            eventId: invitation.eventId,
            eventName: event.eventName,
            eventSlug: event.slug,
          },
        });
      }
    }

    // Update the notification for the invitee (mark as read equivalent)
    const notifType = action === 'accept' ? 'event_cohost_accepted_self' : 'event_cohost_declined_self';
    await db.update(notifications)
      .set({ type: notifType })
      .where(and(
        eq(notifications.recipientId, user.id),
        eq(notifications.type, 'event_cohost_invite'),
      ));

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('POST event host respond:', error);
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
}
