import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db, events, eventInvites } from '@/lib/db';
import { sendInvite } from '@/lib/notify/invites';
import { formatEventSchedule } from '@/lib/notify/email';
import { requireManager } from '@/lib/events/auth';

function classify(raw: string): { email?: string; phone?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes('@')) {
    const email = s.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { email } : null;
  }
  const cleaned = s.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return { phone: cleaned.startsWith('+') ? cleaned : `+${digits}` };
}

function inviteUrl(origin: string, slug: string, token: string) {
  return `${origin}/events/${slug}?invite=${token}`;
}

// GET /api/events/invites?eventId=&privyId= — host lists invites
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const eventId = sp.get('eventId');
    const privyId = sp.get('privyId') ?? undefined;
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [ev] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
    const rows = await db.select().from(eventInvites).where(eq(eventInvites.eventId, eventId)).orderBy(desc(eventInvites.createdAt));
    const origin = request.nextUrl.origin;
    const invites = rows.map((r) => ({ ...r, url: ev ? inviteUrl(origin, ev.slug, r.token) : null }));
    return NextResponse.json({ invites });
  } catch (error) {
    console.error('GET invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST /api/events/invites — host invites people by email/phone.
// Body: { privyId, eventId, recipients: string | string[] }
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    const auth = await requireManager(data.privyId, data.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const raw: string[] = Array.isArray(data.recipients)
      ? data.recipients
      : String(data.recipients ?? '').split(/[\n,;]+/);
    const parsed = raw.map(classify).filter(Boolean) as { email?: string; phone?: string }[];
    if (parsed.length === 0) return NextResponse.json({ error: 'No valid emails or phone numbers' }, { status: 400 });

    const [ev] = await db.select({
      slug: events.slug,
      eventName: events.eventName,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
    }).from(events).where(eq(events.id, data.eventId));
    if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const { when: eventWhen, where: eventWhere } = formatEventSchedule(ev);

    // Existing invites for this event to skip duplicates.
    const existing = await db.select({ email: eventInvites.email, phone: eventInvites.phone }).from(eventInvites).where(eq(eventInvites.eventId, data.eventId));
    const haveEmail = new Set(existing.map((e) => e.email).filter(Boolean));
    const havePhone = new Set(existing.map((e) => e.phone).filter(Boolean));

    const origin = request.nextUrl.origin;
    const created: { id: string; email: string | null; phone: string | null; token: string; status: string; sent: boolean; url: string }[] = [];
    let skipped = 0;

    for (const p of parsed) {
      if (p.email && haveEmail.has(p.email)) { skipped++; continue; }
      if (p.phone && havePhone.has(p.phone)) { skipped++; continue; }

      const token = randomBytes(16).toString('hex');
      const [row] = await db.insert(eventInvites).values({
        eventId: data.eventId,
        email: p.email ?? null,
        phone: p.phone ?? null,
        invitedBy: auth.user.id,
        token,
      }).returning();

      const url = inviteUrl(origin, ev.slug, token);
      // Attempt delivery (no-op if provider not configured).
      const channel = p.email ? 'email' : 'sms';
      const to = (p.email ?? p.phone)!;
      const result = await sendInvite({ channel, to, eventName: ev.eventName, url, inviterName: auth.user.name, eventWhen, eventWhere });
      if (result.sent) {
        await db.update(eventInvites).set({ sent: true, updatedAt: new Date() }).where(eq(eventInvites.id, row.id));
      }

      if (p.email) haveEmail.add(p.email);
      if (p.phone) havePhone.add(p.phone);
      created.push({ id: row.id, email: row.email, phone: row.phone, token, status: row.status, sent: result.sent, url });
    }

    return NextResponse.json({ created, skipped, sentCount: created.filter((c) => c.sent).length }, { status: 201 });
  } catch (error) {
    console.error('POST invites:', error);
    return NextResponse.json({ error: 'Failed to send invites' }, { status: 500 });
  }
}

// DELETE /api/events/invites?id=&privyId= — revoke an invite (host only)
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const privyId = sp.get('privyId') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const [invite] = await db.select({ eventId: eventInvites.eventId }).from(eventInvites).where(eq(eventInvites.id, id));
    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    const auth = await requireManager(privyId, invite.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    await db.delete(eventInvites).where(eq(eventInvites.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE invites:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
