import { db, events, eventRsvps, users, notifications } from '@/lib/db';
import { and, asc, count, eq } from 'drizzle-orm';
import { isEmailConfigured, sendRsvpDecision, formatEventSchedule } from '@/lib/notify/email';

// Fill newly opened capacity from the waitlist, oldest join first. Called after
// anything that frees a slot: a guest withdrawing, a host removing a guest, or
// the host raising/clearing the capacity. Promoted guests flip to 'going' and
// get an in-app notification plus the "you're in" email (same template as an
// approval — the copy fits both). Best-effort: notification/email failures are
// logged, never thrown, and the promotion itself still stands.
export async function promoteFromWaitlist(eventId: string, origin: string): Promise<number> {
  const [event] = await db
    .select({
      eventName: events.eventName,
      slug: events.slug,
      rsvpCapacity: events.rsvpCapacity,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
    })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return 0;

  // How many open slots? Capacity null = unlimited → promote everyone waiting.
  let slots: number | null = null;
  if (event.rsvpCapacity != null) {
    const [{ value: going }] = await db
      .select({ value: count() })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'going')));
    slots = event.rsvpCapacity - going;
    if (slots <= 0) return 0;
  }

  const baseQuery = db
    .select({ id: eventRsvps.id, userId: eventRsvps.userId })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'waitlisted')))
    .orderBy(asc(eventRsvps.createdAt));
  const toPromote = slots != null ? await baseQuery.limit(slots) : await baseQuery;
  if (toPromote.length === 0) return 0;

  const { when: eventWhen, where: eventWhere } = formatEventSchedule(event);
  let promoted = 0;
  for (const row of toPromote) {
    // Guard on status so a concurrent promotion never double-fills a slot.
    const updated = await db
      .update(eventRsvps)
      .set({ status: 'going' })
      .where(and(eq(eventRsvps.id, row.id), eq(eventRsvps.status, 'waitlisted')))
      .returning({ id: eventRsvps.id });
    if (updated.length === 0) continue;
    promoted++;

    try {
      await db.insert(notifications).values({
        recipientId: row.userId,
        actorId: row.userId, // system event — the guest is their own actor
        type: 'event_waitlist_promoted',
        metadata: { eventId, eventName: event.eventName, eventSlug: event.slug },
      });
    } catch (e) {
      console.error('[waitlist] promotion notification failed:', e);
    }

    if (isEmailConfigured()) {
      try {
        const [guest] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, row.userId));
        if (guest?.email) {
          const result = await sendRsvpDecision({
            to: guest.email,
            eventName: event.eventName,
            origin,
            slug: event.slug,
            guestName: guest.name,
            approved: true,
            eventWhen,
            eventWhere,
          });
          if (!result.sent) console.error('[waitlist] promotion email not sent:', result.reason);
        }
      } catch (e) {
        console.error('[waitlist] promotion email failed:', e);
      }
    }
  }

  return promoted;
}
