import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventQuests, eventQuestCompletions, eventCheckins } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';
import { extractQuestCode, getMyQuestState } from '@/lib/events/quests';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

async function isCheckedIn(eventId: string, userId: string): Promise<boolean> {
  const [row] = await db.select({ id: eventCheckins.id }).from(eventCheckins)
    .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, userId))).limit(1);
  return !!row;
}

// POST /api/events/quests/complete
// Attendee self-scan: { privyId, eventId, code } — a scanned quest QR.
// Host grant:         { privyId, eventId, questId, guestUserId } — a manager
// verifies in person (any verify method — the host is the authority).
// Both require the guest to be checked in: check-in unlocks quests.
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, code, questId, guestUserId } = await request.json();
    if (!eventId) return NextResponse.json({ error: 'eventId is required' }, { status: 400 });

    // ── Host grant path ──
    if (questId && guestUserId) {
      const auth = await requireManager(privyId, eventId);
      if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

      const [quest] = await db.select().from(eventQuests)
        .where(and(eq(eventQuests.id, questId), eq(eventQuests.eventId, eventId))).limit(1);
      if (!quest || !quest.isActive) return NextResponse.json({ error: 'Quest not found or inactive' }, { status: 404 });
      if (!(await isCheckedIn(eventId, guestUserId))) {
        return NextResponse.json({ error: 'Guest must be checked in first' }, { status: 400 });
      }

      const inserted = await db.insert(eventQuestCompletions)
        .values({ questId, eventId, userId: guestUserId, verifiedBy: auth.user.id })
        .onConflictDoNothing()
        .returning({ id: eventQuestCompletions.id });
      return NextResponse.json(
        { ok: true, already: inserted.length === 0, quest: { title: quest.title, icon: quest.icon } },
        { headers: NO_STORE },
      );
    }

    // ── Attendee self-scan path ──
    if (!code) return NextResponse.json({ error: 'code or questId+guestUserId required' }, { status: 400 });
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const parsed = extractQuestCode(String(code));
    if (!parsed) return NextResponse.json({ error: "That QR isn't a quest code" }, { status: 404 });

    const [quest] = await db.select().from(eventQuests)
      .where(and(eq(eventQuests.code, parsed), eq(eventQuests.eventId, eventId))).limit(1);
    if (!quest || !quest.isActive) {
      return NextResponse.json({ error: "That code doesn't belong to this event's quests" }, { status: 404 });
    }
    if (!(await isCheckedIn(eventId, viewer.id))) {
      return NextResponse.json({ error: 'Get checked in at the door first — that unlocks quests' }, { status: 403 });
    }

    const inserted = await db.insert(eventQuestCompletions)
      .values({ questId: quest.id, eventId, userId: viewer.id })
      .onConflictDoNothing()
      .returning({ id: eventQuestCompletions.id });

    const progress = await getMyQuestState(eventId, viewer.id);
    return NextResponse.json(
      {
        ok: true,
        already: inserted.length === 0,
        quest: { title: quest.title, icon: quest.icon },
        progress: { completedCount: progress.completedCount, total: progress.total, inRaffle: progress.inRaffle },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[quests] complete failed:', error);
    return NextResponse.json({ error: 'Failed to complete quest' }, { status: 500 });
  }
}
