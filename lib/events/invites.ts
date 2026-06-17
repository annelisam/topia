import { and, eq, or } from 'drizzle-orm';
import { db, eventInvites } from '@/lib/db';

// Flip a pending invite to 'accepted' when its invitee RSVPs. Matches by the
// link token first, then falls back to the verified email/phone on the user.
// Best-effort: never throws into the RSVP flow.
export async function markInviteAccepted(opts: {
  eventId: string;
  userId: string;
  token?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const { eventId, userId, token, email, phone } = opts;
  try {
    let match: { id: string } | undefined;

    if (token) {
      [match] = await db
        .select({ id: eventInvites.id })
        .from(eventInvites)
        .where(and(eq(eventInvites.eventId, eventId), eq(eventInvites.token, token)));
    }

    if (!match && (email || phone)) {
      const conds = [];
      if (email) conds.push(eq(eventInvites.email, email.toLowerCase()));
      if (phone) conds.push(eq(eventInvites.phone, phone));
      if (conds.length) {
        [match] = await db
          .select({ id: eventInvites.id })
          .from(eventInvites)
          .where(and(
            eq(eventInvites.eventId, eventId),
            eq(eventInvites.status, 'pending'),
            conds.length === 1 ? conds[0] : or(...conds),
          ));
      }
    }

    if (match) {
      await db
        .update(eventInvites)
        .set({ status: 'accepted', acceptedByUserId: userId, updatedAt: new Date() })
        .where(eq(eventInvites.id, match.id));
    }
  } catch (e) {
    console.error('markInviteAccepted:', e);
  }
}
