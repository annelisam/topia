import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, events, eventRsvps } from '@/lib/db';
import { requireManager } from '@/lib/events/auth';
import { promoteFromWaitlist } from '@/lib/events/waitlist';

// POST /api/events/settings — manager updates RSVP/registration settings.
// Body: { privyId, eventId, rsvpCapacity?, rsvpApprovalRequired?, rsvpClosed? }
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    const auth = await requireManager(data.privyId, data.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const patch: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
    if (data.rsvpCapacity !== undefined) {
      // Capacity below 1 is meaningless (it would lock everyone out), so any
      // blank / null / sub-1 value is normalized to null = unlimited.
      const n = data.rsvpCapacity === null || data.rsvpCapacity === '' ? NaN : Number(data.rsvpCapacity);
      patch.rsvpCapacity = Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
    }
    if (data.rsvpApprovalRequired !== undefined) patch.rsvpApprovalRequired = Boolean(data.rsvpApprovalRequired);
    if (data.rsvpClosed !== undefined) patch.rsvpClosed = Boolean(data.rsvpClosed);

    // When the host is closing registration, surface a warning if there are
    // still pending join requests that will be left in limbo.
    let warning: string | null = null;
    if (patch.rsvpClosed === true) {
      const pending = await db
        .select({ id: eventRsvps.id })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, data.eventId), eq(eventRsvps.status, 'pending')));
      if (pending.length > 0) {
        warning = `Registration closed with ${pending.length} pending request${pending.length > 1 ? 's' : ''} still awaiting your decision.`;
      }
    }

    const [updated] = await db
      .update(events)
      .set(patch)
      .where(eq(events.id, data.eventId))
      .returning({
        rsvpCapacity: events.rsvpCapacity,
        rsvpApprovalRequired: events.rsvpApprovalRequired,
        rsvpClosed: events.rsvpClosed,
      });

    // Raising (or clearing) the capacity opens slots — promote the waitlist.
    let promoted = 0;
    if (data.rsvpCapacity !== undefined) {
      try {
        promoted = await promoteFromWaitlist(data.eventId, request.nextUrl.origin);
      } catch (e) {
        console.error('[settings] waitlist promotion after capacity change failed:', e);
      }
    }

    return NextResponse.json({ ok: true, settings: updated, warning, promoted });
  } catch (error) {
    console.error('POST event settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
