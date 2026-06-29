import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db, events, eventHosts, eventQuestions, users } from '@/lib/db';
import { QUESTION_TYPES, SELECT_TYPES } from '@/lib/events/questions';

// Single source of truth for valid question types (incl. instagram/twitter).
const ALL_TYPES = new Set(QUESTION_TYPES.map((t) => t.value));

// Resolve the privyId to a user that hosts the event (creator or co-host).
async function requireHost(privyId: string | undefined, eventId: string) {
  if (!privyId) return { error: 'Not authenticated', status: 401 as const };
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
  if (!user) return { error: 'User not found', status: 404 as const };
  const [host] = await db
    .select({ id: eventHosts.id })
    .from(eventHosts)
    .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, user.id)));
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

function normalizeOptions(type: string, options: unknown): string[] | null {
  if (!SELECT_TYPES.has(type)) return null;
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o).trim()).filter(Boolean).slice(0, 30);
}

// GET /api/events/questions?eventId=... | ?slug=...   (public: active only)
// GET /api/events/questions?myEvents=1&privyId=...     (user's events with questions)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    // List the caller's events that have at least one question.
    if (sp.get('myEvents') === '1') {
      const privyId = sp.get('privyId');
      if (!privyId) return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
      if (!user) return NextResponse.json({ events: [] });
      const rows = await db
        .select({
          eventId: events.id,
          eventName: events.eventName,
          slug: events.slug,
          date: events.dateIso,
          questionCount: sql<number>`count(${eventQuestions.id})`.as('qc'),
        })
        .from(events)
        .innerJoin(eventQuestions, and(eq(eventQuestions.eventId, events.id), eq(eventQuestions.isActive, true)))
        .where(eq(events.createdBy, user.id))
        .groupBy(events.id)
        .orderBy(desc(events.createdAt))
        .limit(20);
      return NextResponse.json({ events: rows });
    }

    let eventId = sp.get('eventId') ?? undefined;
    const slug = sp.get('slug');
    const includeInactive = sp.get('includeInactive') === '1';

    if (!eventId && slug) {
      const [ev] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
      if (!ev) return NextResponse.json({ questions: [] });
      eventId = ev.id;
    }
    if (!eventId) return NextResponse.json({ error: 'Missing eventId or slug' }, { status: 400 });

    const rows = await db
      .select()
      .from(eventQuestions)
      .where(eq(eventQuestions.eventId, eventId))
      .orderBy(asc(eventQuestions.sortOrder), asc(eventQuestions.createdAt));

    return NextResponse.json({ questions: includeInactive ? rows : rows.filter((q) => q.isActive) });
  } catch (error) {
    console.error('GET questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST /api/events/questions — create a question (host only)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.eventId || !data.label?.trim()) {
      return NextResponse.json({ error: 'eventId and label are required' }, { status: 400 });
    }
    const auth = await requireHost(data.privyId, data.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const type = ALL_TYPES.has(data.type) ? data.type : 'short_text';
    const [created] = await db
      .insert(eventQuestions)
      .values({
        eventId: data.eventId,
        label: String(data.label).trim().slice(0, 200),
        type,
        options: normalizeOptions(type, data.options),
        required: Boolean(data.required),
        sortOrder: Number.isFinite(data.sortOrder) ? Math.round(data.sortOrder) : 0,
        isActive: data.isActive ?? true,
      })
      .returning();

    return NextResponse.json({ question: created }, { status: 201 });
  } catch (error) {
    console.error('POST questions:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

// PUT /api/events/questions — update a question (host only)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing question id' }, { status: 400 });

    const [existing] = await db.select().from(eventQuestions).where(eq(eventQuestions.id, data.id));
    if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const auth = await requireHost(data.privyId, existing.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const type = data.type != null ? (ALL_TYPES.has(data.type) ? data.type : existing.type) : existing.type;
    const patch: Partial<typeof eventQuestions.$inferInsert> = { updatedAt: new Date() };
    if (data.label != null) patch.label = String(data.label).trim().slice(0, 200);
    if (data.type != null) patch.type = type;
    if (data.options !== undefined || data.type != null) patch.options = normalizeOptions(type, data.options ?? existing.options);
    if (data.required != null) patch.required = Boolean(data.required);
    if (data.sortOrder != null) patch.sortOrder = Math.round(Number(data.sortOrder));
    if (data.isActive != null) patch.isActive = Boolean(data.isActive);

    const [updated] = await db.update(eventQuestions).set(patch).where(eq(eventQuestions.id, data.id)).returning();
    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error('PUT questions:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE /api/events/questions?id=...&privyId=...  (host only)
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const privyId = sp.get('privyId') ?? undefined;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [existing] = await db.select().from(eventQuestions).where(eq(eventQuestions.id, id));
    if (!existing) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    const auth = await requireHost(privyId, existing.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.delete(eventQuestions).where(eq(eventQuestions.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE questions:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
