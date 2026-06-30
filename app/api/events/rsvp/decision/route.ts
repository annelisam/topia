import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { db, users, events, eventRsvps, notifications } from '@/lib/db';
import { isEmailConfigured, sendRsvpDecision, formatEventSchedule } from '@/lib/notify/email';
import { requireManager } from '@/lib/events/auth';

// POST /api/events/rsvp/decision — manager approves or declines a pending RSVP.
// Body: { privyId, eventId, guestUserId, decision: 'approve' | 'decline' }
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, guestUserId, decision } = await request.json();
    if (!privyId || !eventId || !guestUserId || !['approve', 'decline'].includes(decision)) {
      return NextResponse.json({ error: 'privyId, eventId, guestUserId, decision required' }, { status: 400 });
    }

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const host = auth.user;

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
    const [event] = await db.select({
      eventName: events.eventName,
      slug: events.slug,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
    }).from(events).where(eq(events.id, eventId));
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
            const { when: eventWhen, where: eventWhere } = formatEventSchedule(event);
            await sendRsvpDecision({ to: guest.email, eventName: event.eventName, origin: request.nextUrl.origin, slug: event.slug, guestName: guest.name, approved: decision === 'approve', eventWhen, eventWhere });
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
