import { NextResponse } from 'next/server';
import { db, users, events } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/adminAuth';
import { EMAIL_TEMPLATES, getTemplate, renderTemplate } from '@/lib/notify/emailTemplates';
import { formatEventSchedule, sendRawEmail } from '@/lib/notify/email';

type EventRow = typeof events.$inferSelect;
type UserRow = typeof users.$inferSelect;

// Build the {{{VAR}}} values for one recipient + optional event context.
function buildVariables(user: Partial<UserRow> | null, event: EventRow | null, origin: string): Record<string, string> {
  const name = (user?.name || '').trim() || 'there';
  // Passport-card handle: prefer the username, fall back to the user id so the
  // card still renders before a handle is set (the card route resolves either).
  const handle = (user?.username || '').trim() || user?.id || '';
  const card = handle ? `${origin}/api/profile/${encodeURIComponent(handle)}/card` : '';
  // On event emails (RSVP confirmations) the card carries the event seal stamp.
  const stampedCard = card && event ? `${card}?stamp=${encodeURIComponent(event.slug)}` : card;
  const vars: Record<string, string> = {
    GUEST_NAME: name,
    USER_NAME: name,
    USERNAME: user?.username || '',
    PROFILE_URL: `${origin}/onboarding`,
    CARD_URL: stampedCard,
    SHARE_URL: user?.username ? `${origin}/@${user.username}` : `${origin}/onboarding`,
    STORY_URL: card ? `${card}?format=story` : '',
  };
  if (event) {
    const { when, where } = formatEventSchedule(event);
    Object.assign(vars, {
      EVENT_NAME: event.eventName,
      EVENT_URL: `${origin}/events/${event.slug}`,
      MANAGE_URL: `${origin}/events/${event.slug}/manage`,
      EVENT_WHEN: when,
      EVENT_WHERE: where,
      INVITER_NAME: 'The host',
      STATUS: 'rsvp',
    });
  }
  return vars;
}

// Sample values for preview when no real recipient/event is chosen. For
// passport-card templates, pick a real sample user in the UI to preview the
// live card — this generic sample's CARD_URL may not resolve to a profile.
function sampleVariables(origin: string): Record<string, string> {
  return {
    GUEST_NAME: 'Alex', USER_NAME: 'Alex', USERNAME: 'alex', INVITER_NAME: 'Latasha', STATUS: 'rsvp',
    EVENT_NAME: 'Like Minds: A Summer Series',
    EVENT_URL: `${origin}/events/like-minds-a-summer-series`,
    MANAGE_URL: `${origin}/events/like-minds-a-summer-series/manage`,
    EVENT_WHEN: 'Saturday, June 27 · 1:00 PM – 5:00 PM PT',
    EVENT_WHERE: 'The Love Song Bar · Los Angeles',
    PROFILE_URL: `${origin}/onboarding`,
    CARD_URL: `${origin}/api/profile/alex/card`,
    SHARE_URL: `${origin}/@alex`,
    STORY_URL: `${origin}/api/profile/alex/card?format=story`,
  };
}

// GET — template catalogue for the picker.
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    templates: EMAIL_TEMPLATES.map((t) => ({ id: t.id, label: t.label, scope: t.scope, variables: t.variables })),
  });
}

// POST — { action: 'preview' | 'send', ... }
export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { action, templateId, eventId } = body as { action?: string; templateId?: string; eventId?: string };

    const tpl = templateId ? getTemplate(templateId) : undefined;
    if (!tpl) return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    if (tpl.scope === 'event' && !eventId) return NextResponse.json({ error: 'This template needs an event' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const event = eventId ? (await db.select().from(events).where(eq(events.id, eventId)))[0] ?? null : null;
    if (tpl.scope === 'event' && !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    if (action === 'preview') {
      const sampleUserId = (body as { sampleUserId?: string }).sampleUserId;
      let vars: Record<string, string>;
      if (sampleUserId) {
        const [u] = await db.select().from(users).where(eq(users.id, sampleUserId));
        vars = { ...sampleVariables(origin), ...buildVariables(u ?? null, event, origin) };
      } else {
        vars = event ? { ...sampleVariables(origin), ...buildVariables(null, event, origin) } : sampleVariables(origin);
      }
      return NextResponse.json({
        subject: renderTemplate(tpl.subject, vars),
        html: renderTemplate(tpl.html, vars),
      });
    }

    if (action === 'send') {
      const userIds: string[] = Array.isArray((body as { userIds?: string[] }).userIds) ? (body as { userIds: string[] }).userIds : [];
      if (userIds.length === 0) return NextResponse.json({ error: 'Select at least one recipient' }, { status: 400 });

      const recipients = await db.select().from(users).where(inArray(users.id, userIds));
      const results: { userId: string; email: string | null; name: string | null; sent: boolean; reason?: string }[] = [];
      for (const u of recipients) {
        if (!u.email) { results.push({ userId: u.id, email: null, name: u.name, sent: false, reason: 'no_email' }); continue; }
        const vars = buildVariables(u, event, origin);
        const subject = renderTemplate(tpl.subject, vars);
        const html = renderTemplate(tpl.html, vars);
        const r = await sendRawEmail({ to: u.email, subject, html });
        results.push({ userId: u.id, email: u.email, name: u.name, sent: r.sent, reason: r.reason });
      }
      const sentCount = results.filter((r) => r.sent).length;
      return NextResponse.json({ ok: true, sentCount, total: results.length, results });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Admin emails POST:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
