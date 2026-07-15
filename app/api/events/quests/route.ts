import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventQuests, eventQuestCompletions } from '@/lib/db';
import { and, asc, count, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';
import { generateQuestCode, getMyQuestState, AUTO_RULE_KINDS, COUNTED_RULE_KINDS, AutoRule } from '@/lib/events/quests';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const VERIFY_METHODS = new Set(['qr', 'host', 'auto']);

// GET /api/events/quests?eventId=X&privyId=Y[&manage=1]
// manage=1 (managers): every quest incl. inactive, WITH codes + per-quest
// completion counts — the builder view. Otherwise: active quests with the
// viewer's own completion state (codes never leak to attendees).
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const eventId = sp.get('eventId');
    const privyId = sp.get('privyId') ?? undefined;
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    if (sp.get('manage') === '1') {
      const auth = await requireManager(privyId, eventId);
      if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

      const [quests, counts] = await Promise.all([
        db.select().from(eventQuests).where(eq(eventQuests.eventId, eventId))
          .orderBy(asc(eventQuests.sortOrder), asc(eventQuests.createdAt)),
        db.select({ questId: eventQuestCompletions.questId, value: count() })
          .from(eventQuestCompletions)
          .where(eq(eventQuestCompletions.eventId, eventId))
          .groupBy(eventQuestCompletions.questId),
      ]);
      const byQuest = new Map(counts.map((c) => [c.questId, c.value]));
      return NextResponse.json(
        { quests: quests.map((q) => ({ ...q, completions: byQuest.get(q.id) ?? 0 })) },
        { headers: NO_STORE },
      );
    }

    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const state = await getMyQuestState(eventId, viewer.id);
    return NextResponse.json(state, { headers: NO_STORE });
  } catch (error) {
    console.error('[quests] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load quests' }, { status: 500 });
  }
}

// POST /api/events/quests — create (managers). QR quests get a server-minted
// secret code; auto quests carry a validated rule config.
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, title, description, icon, verifyMethod, rule } = await request.json();
    if (!eventId || !title?.trim()) {
      return NextResponse.json({ error: 'eventId and title are required' }, { status: 400 });
    }
    const method = String(verifyMethod || 'qr');
    if (!VERIFY_METHODS.has(method)) {
      return NextResponse.json({ error: 'verifyMethod must be qr, host, or auto' }, { status: 400 });
    }
    let cleanRule: AutoRule | null = null;
    if (method === 'auto') {
      const kind = rule?.kind;
      if (!AUTO_RULE_KINDS.includes(kind)) {
        return NextResponse.json({ error: `auto rule kind must be one of: ${AUTO_RULE_KINDS.join(', ')}` }, { status: 400 });
      }
      cleanRule = (COUNTED_RULE_KINDS as readonly string[]).includes(kind)
        ? { kind, count: Math.max(1, Math.floor(Number(rule?.count ?? 1))) }
        : { kind };
    }

    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [existing] = await db.select({ value: count() }).from(eventQuests).where(eq(eventQuests.eventId, eventId));
    const [quest] = await db.insert(eventQuests).values({
      eventId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      icon: icon ? String(icon).trim().slice(0, 8) : null,
      verifyMethod: method,
      code: method === 'qr' ? generateQuestCode() : null,
      rule: cleanRule,
      sortOrder: existing?.value ?? 0,
    }).returning();

    return NextResponse.json({ quest }, { headers: NO_STORE });
  } catch (error) {
    console.error('[quests] POST failed:', error);
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
  }
}

// PUT /api/events/quests — update title/description/icon/isActive/sortOrder.
export async function PUT(request: NextRequest) {
  try {
    const { privyId, id, title, description, icon, isActive, sortOrder } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const [quest] = await db.select({ eventId: eventQuests.eventId }).from(eventQuests).where(eq(eventQuests.id, id)).limit(1);
    if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });

    const auth = await requireManager(privyId, quest.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.update(eventQuests).set({
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
      ...(icon !== undefined ? { icon: icon ? String(icon).trim().slice(0, 8) : null } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      updatedAt: new Date(),
    }).where(eq(eventQuests.id, id));

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[quests] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update quest' }, { status: 500 });
  }
}

// DELETE /api/events/quests?id=X&privyId=Y — removes the quest and (cascade)
// its completions. Prefer the isActive toggle mid-event; delete is for
// mistakes, matching the registration-questions builder.
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');
    const privyId = sp.get('privyId') ?? undefined;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const [quest] = await db.select({ eventId: eventQuests.eventId }).from(eventQuests).where(eq(eventQuests.id, id)).limit(1);
    if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });

    const auth = await requireManager(privyId, quest.eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.delete(eventQuests).where(eq(eventQuests.id, id));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[quests] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete quest' }, { status: 500 });
  }
}
