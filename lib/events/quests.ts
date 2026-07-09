// Quest domain logic — codes, dynamic verification rules, per-guest state,
// event-wide progress, and the raffle pool. No points anywhere: finishing
// ALL active quests puts a guest in the event's raffle.
import { randomBytes } from 'crypto';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import {
  db, users, eventQuests, eventQuestCompletions, eventCheckins, eventConnections,
} from '@/lib/db';

// Same unambiguous alphabet as ticket + connect codes; QST- namespace keeps
// quest codes distinguishable from Topia connect codes at scan time.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateQuestCode(): string {
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `QST-${out.slice(0, 5)}-${out.slice(5)}`;
}

/** Pull a quest code out of a scanned QR value — the printed QR encodes
 * /events/<slug>/live?quest=<code>, but a bare code also works. */
export function extractQuestCode(scanned: string): string | null {
  const url = scanned.trim().match(/[?&]quest=([A-Za-z0-9-]+)/);
  if (url) return url[1].toUpperCase();
  const bare = scanned.trim().toUpperCase();
  return /^QST-[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(bare) ? bare : null;
}

// Auto rules are jsonb so new kinds ship without schema changes. Unknown
// kinds never auto-complete (forward-compatible: an old server ignores a
// rule kind it doesn't know rather than mis-granting).
export type AutoRule = { kind: string; count?: number };
export const AUTO_RULE_KINDS = ['checkin', 'connections'] as const;

export function evaluateAutoRule(
  rule: AutoRule | null | undefined,
  ctx: { checkedIn: boolean; connections: number },
): boolean {
  if (!rule || typeof rule !== 'object') return false;
  switch (rule.kind) {
    case 'checkin':
      return ctx.checkedIn;
    case 'connections':
      return ctx.connections >= Math.max(1, Number(rule.count ?? 1));
    default:
      return false;
  }
}

async function autoContext(eventId: string, userId: string) {
  const [checkinRows, connRows] = await Promise.all([
    db.select({ id: eventCheckins.id }).from(eventCheckins)
      .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, userId))).limit(1),
    db.select({ id: eventConnections.id }).from(eventConnections)
      .where(and(
        eq(eventConnections.eventId, eventId),
        or(eq(eventConnections.userAId, userId), eq(eventConnections.userBId, userId)),
      )),
  ]);
  return { checkedIn: checkinRows.length > 0, connections: connRows.length };
}

/** The viewer's quest state for an event. Satisfied auto quests are
 * materialized into event_quest_completions (idempotent via the unique
 * index) so raffle, progress, and passport stamps all read one table. */
export async function getMyQuestState(eventId: string, userId: string) {
  const quests = await db.select().from(eventQuests)
    .where(and(eq(eventQuests.eventId, eventId), eq(eventQuests.isActive, true)))
    .orderBy(asc(eventQuests.sortOrder), asc(eventQuests.createdAt));

  const done = await db
    .select({ questId: eventQuestCompletions.questId, at: eventQuestCompletions.createdAt })
    .from(eventQuestCompletions)
    .where(and(eq(eventQuestCompletions.eventId, eventId), eq(eventQuestCompletions.userId, userId)));
  const doneAt = new Map(done.map((d) => [d.questId, d.at]));

  const pendingAuto = quests.filter((q) => q.verifyMethod === 'auto' && !doneAt.has(q.id));
  if (pendingAuto.length) {
    const ctx = await autoContext(eventId, userId);
    const satisfied = pendingAuto.filter((q) => evaluateAutoRule(q.rule as AutoRule, ctx));
    if (satisfied.length) {
      const rows = await db.insert(eventQuestCompletions)
        .values(satisfied.map((q) => ({ questId: q.id, eventId, userId })))
        .onConflictDoNothing()
        .returning({ questId: eventQuestCompletions.questId, at: eventQuestCompletions.createdAt });
      for (const r of rows) doneAt.set(r.questId, r.at);
    }
  }

  // No `code` in the attendee payload — QR quest codes are secrets.
  const list = quests.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    icon: q.icon,
    verifyMethod: q.verifyMethod,
    rule: q.rule as AutoRule | null,
    completed: doneAt.has(q.id),
    completedAt: doneAt.get(q.id) ?? null,
  }));
  const completedCount = list.filter((q) => q.completed).length;
  return {
    quests: list,
    total: list.length,
    completedCount,
    inRaffle: list.length > 0 && completedCount === list.length,
  };
}

/** Event-wide progress: everyone who checked in or completed something,
 * with completed counts (stored rows + live auto evaluation for others —
 * only the viewer's own autos get materialized, to keep this read cheap). */
export async function getEventQuestProgress(eventId: string) {
  const quests = await db
    .select({ id: eventQuests.id, verifyMethod: eventQuests.verifyMethod, rule: eventQuests.rule })
    .from(eventQuests)
    .where(and(eq(eventQuests.eventId, eventId), eq(eventQuests.isActive, true)));
  if (quests.length === 0) return { total: 0, entries: [] };

  const [completions, checkins, conns] = await Promise.all([
    db.select({ questId: eventQuestCompletions.questId, userId: eventQuestCompletions.userId })
      .from(eventQuestCompletions).where(eq(eventQuestCompletions.eventId, eventId)),
    db.select({ userId: eventCheckins.userId }).from(eventCheckins).where(eq(eventCheckins.eventId, eventId)),
    db.select({ a: eventConnections.userAId, b: eventConnections.userBId })
      .from(eventConnections).where(eq(eventConnections.eventId, eventId)),
  ]);

  const connCount = new Map<string, number>();
  for (const c of conns) {
    connCount.set(c.a, (connCount.get(c.a) ?? 0) + 1);
    connCount.set(c.b, (connCount.get(c.b) ?? 0) + 1);
  }
  const checkedIn = new Set(checkins.map((c) => c.userId));
  const doneByUser = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!doneByUser.has(c.userId)) doneByUser.set(c.userId, new Set());
    doneByUser.get(c.userId)!.add(c.questId);
  }

  const participants = new Set([...checkedIn, ...doneByUser.keys()]);
  const autoQuests = quests.filter((q) => q.verifyMethod === 'auto');

  const raw = Array.from(participants).map((userId) => {
    const stored = doneByUser.get(userId) ?? new Set<string>();
    let completedCount = stored.size;
    const ctx = { checkedIn: checkedIn.has(userId), connections: connCount.get(userId) ?? 0 };
    for (const q of autoQuests) {
      if (!stored.has(q.id) && evaluateAutoRule(q.rule as AutoRule, ctx)) completedCount++;
    }
    return { userId, completedCount, inRaffle: completedCount === quests.length };
  });

  const ids = raw.map((r) => r.userId);
  const people = ids.length
    ? await db.select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
        .from(users).where(inArray(users.id, ids))
    : [];
  const byId = new Map(people.map((p) => [p.id, p]));

  const entries = raw
    .map((r) => ({ ...r, ...(byId.get(r.userId) ?? { name: null, username: null, avatarUrl: null }) }))
    .sort((x, y) => y.completedCount - x.completedCount);

  return { total: quests.length, entries };
}
