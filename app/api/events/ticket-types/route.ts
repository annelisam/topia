import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db, events, eventHosts, eventTicketTypes, users } from '@/lib/db';

// Resolve the user behind a privyId and confirm they host the event.
async function requireHost(privyId: string | undefined, eventId: string) {
  if (!privyId) return { error: 'Not authenticated', status: 401 as const };
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
  if (!user) return { error: 'User not found', status: 404 as const };
  const [host] = await db
    .select({ id: eventHosts.id })
    .from(eventHosts)
    .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, user.id)));
  // Fall back to the event's createdBy for original (non-external) events.
  if (!host) {
    const [ev] = await db
      .select({ createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events)
      .where(eq(events.id, eventId));
    if (!ev || ev.createdBy !== user.id || ev.externalSource) {
      return { error: 'Not authorized', status: 403 as const };
    }
  }
  return { userId: user.id };
}

// GET /api/events/ticket-types?eventId=... OR ?slug=...
// Public — lists active tiers (hosts see inactive too via includeInactive=1).
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    let eventId = sp.get('eventId') ?? undefined;
    const slug = sp.get('slug');
    const includeInactive = sp.get('includeInactive') === '1';

    if (!eventId && slug) {
      const [ev] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
      if (!ev) return NextResponse.json({ ticketTypes: [] });
      eventId = ev.id;
    }
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId or slug' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(eventTicketTypes)
      .where(eq(eventTicketTypes.eventId, eventId))
      .orderBy(asc(eventTicketTypes.sortOrder), asc(eventTicketTypes.createdAt));

    const visible = includeInactive ? rows : rows.filter((t) => t.isActive);
    // Derive remaining supply for the client (null = unlimited).
    const ticketTypes = visible.map((t) => ({
      ...t,
      remaining: t.quantityTotal == null ? null : Math.max(0, t.quantityTotal - t.quantitySold),
      soldOut: t.quantityTotal != null && t.quantitySold >= t.quantityTotal,
    }));

    return NextResponse.json({ ticketTypes });
  } catch (error) {
    console.error('GET ticket-types:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 });
  }
}

// POST /api/events/ticket-types — create a tier (host only)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.eventId || !data.name) {
      return NextResponse.json({ error: 'eventId and name are required' }, { status: 400 });
    }
    const auth = await requireHost(data.privyId, data.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const priceCents = Math.max(0, Math.round(Number(data.priceCents ?? 0)));
    const quantityTotal =
      data.quantityTotal == null || data.quantityTotal === ''
        ? null
        : Math.max(0, Math.round(Number(data.quantityTotal)));

    const [created] = await db
      .insert(eventTicketTypes)
      .values({
        eventId: data.eventId,
        name: String(data.name).slice(0, 120),
        description: data.description || null,
        priceCents,
        currency: data.currency || 'USD',
        quantityTotal,
        maxPerOrder: data.maxPerOrder ? Math.max(1, Math.round(Number(data.maxPerOrder))) : 10,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json({ ticketType: created }, { status: 201 });
  } catch (error) {
    console.error('POST ticket-types:', error);
    return NextResponse.json({ error: 'Failed to create ticket type' }, { status: 500 });
  }
}

// PUT /api/events/ticket-types — update a tier (host only)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing ticket type id' }, { status: 400 });

    const [existing] = await db
      .select()
      .from(eventTicketTypes)
      .where(eq(eventTicketTypes.id, data.id));
    if (!existing) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });

    const auth = await requireHost(data.privyId, existing.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const patch: Partial<typeof eventTicketTypes.$inferInsert> = { updatedAt: new Date() };
    if (data.name != null) patch.name = String(data.name).slice(0, 120);
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.priceCents != null) patch.priceCents = Math.max(0, Math.round(Number(data.priceCents)));
    if (data.currency != null) patch.currency = data.currency;
    if (data.quantityTotal !== undefined)
      patch.quantityTotal =
        data.quantityTotal === null || data.quantityTotal === ''
          ? null
          : Math.max(0, Math.round(Number(data.quantityTotal)));
    if (data.maxPerOrder != null) patch.maxPerOrder = Math.max(1, Math.round(Number(data.maxPerOrder)));
    if (data.isActive != null) patch.isActive = Boolean(data.isActive);
    if (data.sortOrder != null) patch.sortOrder = Math.round(Number(data.sortOrder));

    const [updated] = await db
      .update(eventTicketTypes)
      .set(patch)
      .where(eq(eventTicketTypes.id, data.id))
      .returning();

    return NextResponse.json({ ticketType: updated });
  } catch (error) {
    console.error('PUT ticket-types:', error);
    return NextResponse.json({ error: 'Failed to update ticket type' }, { status: 500 });
  }
}

// DELETE /api/events/ticket-types?id=...&privyId=...  (host only)
// Soft-deactivates if any have sold (preserves order history); hard-deletes
// an untouched tier.
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const privyId = sp.get('privyId') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [existing] = await db.select().from(eventTicketTypes).where(eq(eventTicketTypes.id, id));
    if (!existing) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });

    const auth = await requireHost(privyId, existing.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (existing.quantitySold > 0) {
      await db
        .update(eventTicketTypes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(eventTicketTypes.id, id));
      return NextResponse.json({ deactivated: true });
    }
    await db.delete(eventTicketTypes).where(eq(eventTicketTypes.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE ticket-types:', error);
    return NextResponse.json({ error: 'Failed to delete ticket type' }, { status: 500 });
  }
}
