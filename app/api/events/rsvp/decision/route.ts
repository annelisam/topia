import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { db, users, events, eventRsvps, eventHosts, notifications } from '@/lib/db';
import { isEmailConfigured, sendRsvpDecision } from '@/lib/notify/email';

// POST /api/events/rsvp/decision — host approves or declines a pending RSVP.
// Body: { privyId, eventId, guestUserId, decision: 'approve' | 'decline' }
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, guestUserId, decision } = await request.json();
    if (!privyId || !eventId || !guestUserId || !['approve', 'decline'].includes(decision)) {
      return NextResponse.json({ error: 'privyId, eventId, guestUserId, decision required' }, { status: 400 });
    }

    // Auth: caller must host the event.
    const [host] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!host) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [isHost] = await db
      .select({ id: eventHosts.id })
      .from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, host.id)));
    if (!isHost) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const [rsvp] = await db
      .select({ status: eventRsvps.status })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, guestUserId)));
    if (!rsvp) return NextResponse.json({ error: 'RSVP not found' }, { status: 404 });

    const newStatus = decision === 'approve' ? 'going' : 'declined';

    // On approval, respect capacity (confirmed guests only).
    if (decision === 'approve') {
      const [ev] = await db.select({ rsvpCapacity: events.rsvpCapacity }).from(events).where(eq(events.id, eventId));
      if (ev?.rsvpCapacity != null) {
        const [{ value: going }] = await db
          .select({ value: count() })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'going')));
        if (going >= ev.rsvpCapacity) {
          return NextResponse.json({ error: 'Event is at capacity' }, { status: 409 });
        }
      }
    }

    await db
      .update(eventRsvps)
      .set({ status: newStatus })
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, guestUserId)));

    // Notify the guest of the decision.
    const [event] = await db.select({ eventName: events.eventName, slug: events.slug }).from(events).where(eq(events.id, eventId));
    if (event) {
      await db.insert(notifications).values({
        recipientId: guestUserId,
        actorId: host.id,
        type: decision === 'approve' ? 'event_rsvp_approved' : 'event_rsvp_declined',
        metadata: { eventId, eventName: event.eventName, eventSlug: event.slug },
      });

      // Email the guest the decision — best-effort, dormant until configured.
      if (isEmailConfigured()) {
        try {
          const [guest] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, guestUserId));
          if (guest?.email) {
            await sendRsvpDecision({ to: guest.email, eventName: event.eventName, origin: request.nextUrl.origin, slug: event.slug, guestName: guest.name, approved: decision === 'approve' });
          }
        } catch (e) { console.error('rsvp decision email:', e); }
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error('POST rsvp decision:', error);
    return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 });
  }
}
