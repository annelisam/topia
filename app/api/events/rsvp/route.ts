import { NextRequest, NextResponse } from 'next/server';
import { db, users, events, eventRsvps, eventHosts, eventQuestions, notifications } from '@/lib/db';
import { eq, and, count } from 'drizzle-orm';
import { markInviteAccepted } from '@/lib/events/invites';
import { verifyPrivyEmails } from '@/lib/auth/privyServer';
import { isEmailConfigured, sendRsvpConfirmation, sendHostRsvpAlert } from '@/lib/notify/email';
import { roleLabelToSlug } from '@/lib/profile/roleTags';

type AnswerMap = Record<string, string | string[] | boolean>;

function isAnswered(type: string, v: string | string[] | boolean | undefined): boolean {
  if (v == null) return false;
  if (type === 'checkbox') return v === true;
  if (Array.isArray(v)) return v.length > 0;
  if (type === 'socials') {
    try { const o = JSON.parse(String(v)); return !!(o.instagram || o.x); } catch { return false; }
  }
  return String(v).trim().length > 0;
}

// Resolve the user for a privyId, creating a minimal row if they're brand new
// (an external visitor who just verified with Privy). The LoginButton sync fills
// in email/name shortly after; we only need the row to exist to attach an RSVP.
// Resolve the user, creating a minimal row for brand-new visitors, then fill in
// the contact fields they entered on the registration form (only writing over
// blanks for name/phone so we don't clobber an existing profile).
async function resolveOrCreateUser(privyId: string, hint: { email?: string; name?: string; phone?: string }) {
  const [found] = await db.select({ id: users.id, name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.privyId, privyId));
  if (found) {
    const patch: { name?: string; phone?: string; email?: string; updatedAt?: Date } = {};
    // Only ever fill blanks from RSVP contact fields — never clobber an
    // existing profile name/phone/email the user has already set.
    if (hint.name?.trim() && !found.name) patch.name = hint.name.trim();
    if (hint.phone?.trim() && !found.phone) patch.phone = hint.phone.trim();
    if (hint.email?.trim() && !found.email) patch.email = hint.email.trim();
    if (Object.keys(patch).length) {
      patch.updatedAt = new Date();
      try { await db.update(users).set(patch).where(eq(users.id, found.id)); } catch {}
    }
    return found.id;
  }
  try {
    const [created] = await db
      .insert(users)
      .values({ privyId, email: hint.email ?? null, name: hint.name ?? null, phone: hint.phone ?? null })
      .returning({ id: users.id });
    return created.id;
  } catch {
    // Unique race (email/phone/privyId) — re-select.
    const [again] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    return again?.id ?? null;
  }
}

// POST /api/events/rsvp — register for an event (with custom-question answers)
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, answers, email, name, phone, inviteToken, accessToken } = await request.json() as {
      privyId?: string; eventId?: string; answers?: AnswerMap; email?: string; name?: string; phone?: string; inviteToken?: string; accessToken?: string;
    };

    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }
    // A verified email is required to RSVP. The body's `email` is not trusted —
    // we confirm it against Privy's record of this user's verified accounts.
    if (!email?.trim()) {
      return NextResponse.json({ error: 'A verified email is required to RSVP' }, { status: 400 });
    }
    const verification = await verifyPrivyEmails(accessToken);
    if (verification.configured) {
      // Enforcement is active (PRIVY_APP_SECRET is set).
      if (!verification.ok) {
        return NextResponse.json({ error: 'Could not verify your email — please verify with Privy and try again' }, { status: 401 });
      }
      if (!verification.verifiedEmails.includes(email.trim().toLowerCase())) {
        return NextResponse.json({ error: 'This email is not verified on your account' }, { status: 403 });
      }
    } else {
      // PRIVY_APP_SECRET not configured — server-side verification is inactive.
      // The client still gates on a verified email, but until the secret is set
      // this check is advisory only. See lib/auth/privyServer.ts.
      console.warn('[rsvp] PRIVY_APP_SECRET not set — email verification not enforced server-side');
    }
    // Phone is optional, but if provided it must look like a real number.
    if (phone && phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Please provide a valid phone number, or none at all' }, { status: 400 });
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

    const userId = await resolveOrCreateUser(privyId, { email, name, phone });
    if (!userId) return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });

    // Already registered? Respond idempotently — re-submitting (e.g. when a
    // login race re-opens the form) just confirms the existing RSVP instead of
    // erroring with "already registered".
    const [existing] = await db
      .select({ id: eventRsvps.id, status: eventRsvps.status })
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
    if (existing) {
      return NextResponse.json({ rsvp: existing, status: existing.status, alreadyRegistered: true }, { status: 200 });
    }

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

    // Carry the "What do you do?" (roles) answer back to the user's profile, so
    // the registration question and the profile stay in sync. Merge (union) —
    // never shrink the profile's existing craft tags.
    try {
      const incoming: string[] = [];
      for (const q of questions) {
        if (q.type !== 'roles') continue;
        const ans = a[q.id];
        if (Array.isArray(ans)) incoming.push(...ans.map((l) => roleLabelToSlug(String(l))));
      }
      if (incoming.length) {
        const [prof] = await db.select({ roleTags: users.roleTags }).from(users).where(eq(users.id, userId));
        const existing = (prof?.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        const merged = [...new Set([...existing, ...incoming])];
        if (merged.length && merged.join(',') !== existing.join(',')) {
          await db.update(users).set({ roleTags: merged.join(','), updatedAt: new Date() }).where(eq(users.id, userId));
        }
      }
    } catch (e) { console.error('rsvp roles → profile sync:', e); }

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

    // Transactional emails — best-effort, dormant until RESEND_API_KEY is set.
    if (isEmailConfigured()) {
      const origin = request.nextUrl.origin;
      // Guest: confirmation (instant) or "request received" (approval on).
      if (email) {
        try {
          await sendRsvpConfirmation({ to: email, eventName: event.eventName, origin, slug: event.slug, guestName: name, approvalRequired: status === 'pending' });
        } catch (e) { console.error('rsvp confirmation email:', e); }
      }
      // Hosts: alert (skip the actor when a host RSVPs their own event).
      try {
        const hostRows = await db
          .select({ userId: eventHosts.userId, email: users.email })
          .from(eventHosts)
          .innerJoin(users, eq(eventHosts.userId, users.id))
          .where(eq(eventHosts.eventId, eventId));
        await Promise.allSettled(
          hostRows
            .filter((h) => h.email && h.userId !== userId)
            .map((h) => sendHostRsvpAlert({ to: h.email!, eventName: event.eventName, origin, slug: event.slug, guestName: name, pending: status === 'pending' })),
        );
      } catch (e) { console.error('host rsvp alert email:', e); }
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
