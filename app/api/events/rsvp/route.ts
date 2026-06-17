import { NextRequest, NextResponse } from 'next/server';
import { db, users, events, eventRsvps, eventHosts, eventQuestions, notifications } from '@/lib/db';
import { eq, and, count } from 'drizzle-orm';
import { markInviteAccepted } from '@/lib/events/invites';

type AnswerMap = Record<string, string | string[] | boolean>;

function isAnswered(type: string, v: string | string[] | boolean | undefined): boolean {
  if (v == null) return false;
  if (type === 'checkbox') return v === true;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}

// Resolve the user for a privyId, creating a minimal row if they're brand new
// (an external visitor who just verified with Privy). The LoginButton sync fills
// in email/name shortly after; we only need the row to exist to attach an RSVP.
async function resolveOrCreateUser(privyId: string, hint: { email?: string; name?: string }) {
  const [found] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
  if (found) return found.id;
  try {
    const [created] = await db
      .insert(users)
      .values({ privyId, email: hint.email ?? null, name: hint.name ?? null })
      .returning({ id: users.id });
    return created.id;
  } catch {
    // Unique race (email/privyId) — re-select.
    const [again] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    return again?.id ?? null;
  }
}

// POST /api/events/rsvp — register for an event (with custom-question answers)
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, answers, email, name, inviteToken } = await request.json() as {
      privyId?: string; eventId?: string; answers?: AnswerMap; email?: string; name?: string; inviteToken?: string;
    };

    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    const [event] = await db
      .select({
        eventName: events.eventName,
        slug: events.slug,
        rsvpCapacity: events.rsvpCapacity,
        rsvpApprovalRequired: events.rsvpApprovalRequired,
        rsvpClosed: events.rsvpClosed,
      })
      .from(events)
      .where(eq(events.id, eventId));
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.rsvpClosed) return NextResponse.json({ error: 'Registration is closed' }, { status: 403 });

    const userId = await resolveOrCreateUser(privyId, { email, name });
    if (!userId) return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });

    // Already registered?
    const [existing] = await db
      .select({ id: eventRsvps.id })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
    if (existing) return NextResponse.json({ error: "You're already registered" }, { status: 409 });

    // Validate required questions + snapshot answers.
    const questions = await db
      .select()
      .from(eventQuestions)
      .where(and(eq(eventQuestions.eventId, eventId), eq(eventQuestions.isActive, true)));
    const a: AnswerMap = answers ?? {};
    for (const q of questions) {
      if (q.required && !isAnswered(q.type, a[q.id])) {
        return NextResponse.json({ error: `Please answer: ${q.label}` }, { status: 400 });
      }
    }
    const responses = questions.map((q) => ({
      questionId: q.id,
      label: q.label,
      type: q.type,
      answer: a[q.id] ?? null,
    }));

    // Capacity — counts confirmed ('going') guests. With approval on, capacity is
    // enforced at approval time, so pending requests are always accepted here.
    if (event.rsvpCapacity != null && !event.rsvpApprovalRequired) {
      const [{ value: going }] = await db
        .select({ value: count() })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'going')));
      if (going >= event.rsvpCapacity) {
        return NextResponse.json({ error: 'This event is full' }, { status: 409 });
      }
    }

    const status = event.rsvpApprovalRequired ? 'pending' : 'going';
    const [rsvp] = await db
      .insert(eventRsvps)
      .values({ eventId, userId, status, responses: responses.length ? responses : null })
      .returning();

    // If this registration came from an invite, mark it accepted (by token, or
    // by the user's verified email/phone).
    const [u] = await db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, userId));
    await markInviteAccepted({ eventId, userId, token: inviteToken, email: u?.email ?? email ?? null, phone: u?.phone ?? null });

    // Notify hosts — distinguish a confirmed RSVP from an approval request.
    const hosts = await db.select({ userId: eventHosts.userId }).from(eventHosts).where(eq(eventHosts.eventId, eventId));
    for (const host of hosts) {
      if (host.userId !== userId) {
        await db.insert(notifications).values({
          recipientId: host.userId,
          actorId: userId,
          type: status === 'pending' ? 'event_rsvp_request' : 'event_rsvp',
          metadata: { eventId, eventName: event.eventName, eventSlug: event.slug },
        });
      }
    }

    return NextResponse.json({ rsvp, status }, { status: 201 });
  } catch (error) {
    console.error('POST event RSVP:', error);
    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 });
  }
}

// DELETE /api/events/rsvp — withdraw RSVP
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, eventId } = await request.json();
    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.delete(eventRsvps).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, user.id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE event RSVP:', error);
    return NextResponse.json({ error: 'Failed to remove RSVP' }, { status: 500 });
  }
}
