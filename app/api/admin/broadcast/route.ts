import { NextResponse } from 'next/server';
import { db, events, users, eventRsvps } from '@/lib/db';
import { and, eq, isNotNull } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/adminAuth';
import { sendBulkEmails } from '@/lib/notify/email';
import { markdownToEmailHtml, renderBroadcastEmail, fillPlaceholders } from '@/lib/notify/markdownEmail';

// A blast to many recipients runs the Resend batch loop (throttled), so give the
// function room beyond the default. ~1k recipients ≈ 10 batches ≈ a few seconds.
export const maxDuration = 60;

type EventRow = typeof events.$inferSelect;

// All confirmed ('going') RSVPs for an event who have an email on file, deduped
// by email (phone/wallet-only guests are skipped — nothing to send to).
async function goingRecipients(eventId: string) {
  const rows = await db
    .select({ email: users.email, name: users.name, username: users.username })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'going'), isNotNull(users.email)));
  const seen = new Set<string>();
  const out: { email: string; name: string | null }[] = [];
  for (const r of rows) {
    const email = (r.email || '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name: r.name });
  }
  return out;
}

function varsFor(name: string | null, event: EventRow, origin: string): Record<string, string> {
  const full = (name || '').trim() || 'there';
  return {
    name: full,
    firstName: full.split(/\s+/)[0] || 'there',
    eventName: event.eventName,
    eventUrl: `${origin}/events/${event.slug}`,
  };
}

function renderFor(markdown: string, subject: string, vars: Record<string, string>, event: EventRow, origin: string) {
  const filledSubject = fillPlaceholders(subject, vars).trim() || event.eventName;
  const body = markdownToEmailHtml(fillPlaceholders(markdown, vars));
  const html = renderBroadcastEmail({
    bodyHtml: body,
    preheader: filledSubject,
    eventName: event.eventName,
    eventUrl: `${origin}/events/${event.slug}`,
  });
  return { subject: filledSubject, html };
}

// GET ?eventId= — recipient count for the picker.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const eventId = new URL(request.url).searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const recipients = await goingRecipients(eventId);
  return NextResponse.json({ eventName: event.eventName, recipientCount: recipients.length });
}

// POST { action: 'preview' | 'send', eventId, subject, markdown }
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { action, eventId, subject, markdown } = (await request.json()) as {
      action?: string; eventId?: string; subject?: string; markdown?: string;
    };
    if (!eventId) return NextResponse.json({ error: 'Pick an event' }, { status: 400 });
    if (!markdown?.trim()) return NextResponse.json({ error: 'Write a message' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (action === 'preview') {
      // Sample recipient so {{name}} resolves to something concrete.
      const recipients = await goingRecipients(eventId);
      const sampleName = recipients[0]?.name || 'Alex';
      const { subject: subj, html } = renderFor(markdown, subject || '', varsFor(sampleName, event, origin), event, origin);
      return NextResponse.json({ subject: subj, html, recipientCount: recipients.length });
    }

    if (action === 'send') {
      if (!subject?.trim()) return NextResponse.json({ error: 'Add a subject' }, { status: 400 });
      const recipients = await goingRecipients(eventId);
      if (recipients.length === 0) return NextResponse.json({ error: 'No confirmed RSVPs with an email for this event' }, { status: 400 });

      const messages = recipients.map((r) => {
        const { subject: subj, html } = renderFor(markdown, subject, varsFor(r.name, event, origin), event, origin);
        return { to: r.email, subject: subj, html };
      });

      const result = await sendBulkEmails(messages);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin broadcast POST:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
