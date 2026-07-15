// Quest domain logic — codes, dynamic verification rules, per-guest state,
// event-wide progress, and the raffle pool. No points anywhere: finishing
// ALL active quests puts a guest in the event's raffle.
import { randomBytes } from 'crypto';
import { and, asc, count, eq, inArray, or } from 'drizzle-orm';
import {
  db, users, follows, conversations, messages,
  eventQuests, eventQuestCompletions, eventCheckins, eventConnections,
} from '@/lib/db';
import { dmKey } from '@/lib/messages';

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
//
//   signup      — having a Topia account at all (instant first win for
//                 brand-new users; they can't even see quests without one)
//   checkin     — checked in at this event's door
//   connections — traded QR scans with N people AT this event (IRL meets)
//   follows     — connected with N people anywhere on Topia; a sent
//                 request (one-directional follow) counts
//   dm          — messaged N of the people they met at THIS event
export type AutoRule = { kind: string; count?: number };
export const AUTO_RULE_KINDS = ['signup', 'checkin', 'connections', 'follows', 'dm'] as const;
// Kinds whose rule carries a target count.
export const COUNTED_RULE_KINDS = ['connections', 'follows', 'dm'] as const;
// Kinds a guest can only progress in the room — everything else can start
// (or finish) before they're checked in, which is deliberate: a new user
// sees momentum the moment they open Event Mode.
export const PRESENCE_RULE_KINDS = ['checkin', 'connections', 'dm'] as const;

export type AutoContext = {
  checkedIn: boolean;
  connections: number; // event_connections rows at this event
  follows: number;     // all-time follows the user has sent
  dmsToMet: number;    // distinct event-connections they've messaged
};

export function ruleTarget(rule: AutoRule | null | undefined): number {
  return Math.max(1, Math.floor(Number(rule?.count ?? 1)));
}

export function evaluateAutoRule(
  rule: AutoRule | null | undefined,
  ctx: AutoContext,
): boolean {
  if (!rule || typeof rule !== 'object') return false;
  switch (rule.kind) {
    case 'signup':
      return true; // they have an account — that IS the quest
    case 'checkin':
      return ctx.checkedIn;
    case 'connections':
      return ctx.connections >= ruleTarget(rule);
    case 'follows':
      return ctx.follows >= ruleTarget(rule);
    case 'dm':
      return ctx.dmsToMet >= ruleTarget(rule);
    default:
      return false;
  }
}

/** The live counter behind a counted rule, or null for binary rules. */
function ruleProgressValue(rule: AutoRule | null | undefined, ctx: AutoContext): number | null {
  switch (rule?.kind) {
    case 'connections': return ctx.connections;
    case 'follows': return ctx.follows;
    case 'dm': return ctx.dmsToMet;
    default: return null;
  }
}

/** Distinct conversation count = distinct partners messaged, because 1:1
 * conversations are unique per pair (dmKey). */
async function countDmsToPartners(userId: string, partnerIds: string[]): Promise<number> {
  if (partnerIds.length === 0) return 0;
  const keys = [...new Set(partnerIds.map((p) => dmKey(userId, p)))];
  const convs = await db.select({ id: conversations.id }).from(conversations)
    .where(inArray(conversations.dmKey, keys));
  if (convs.length === 0) return 0;
  const sent = await db.select({ conversationId: messages.conversationId }).from(messages)
    .where(and(
      inArray(messages.conversationId, convs.map((c) => c.id)),
      eq(messages.senderId, userId),
    ))
    .groupBy(messages.conversationId);
  return sent.length;
}

// Only fetch the signals the event's rules actually use — a QR-only event
// pays for none of this.
async function autoContext(eventId: string, userId: string, kinds: Set<string>): Promise<AutoContext> {
  const needConns = kinds.has('connections') || kinds.has('dm');
  const [checkinRows, connRows, followRows] = await Promise.all([
    kinds.has('checkin')
      ? db.select({ id: eventCheckins.id }).from(eventCheckins)
          .where(and(eq(eventCheckins.eventId, eventId), eq(eventCheckins.userId, userId))).limit(1)
      : Promise.resolve([]),
    needConns
      ? db.select({ a: eventConnections.userAId, b: eventConnections.userBId }).from(eventConnections)
          .where(and(
            eq(eventConnections.eventId, eventId),
            or(eq(eventConnections.userAId, userId), eq(eventConnections.userBId, userId)),
          ))
      : Promise.resolve([]),
    kinds.has('follows')
      ? db.select({ value: count() }).from(follows).where(eq(follows.followerId, userId))
      : Promise.resolve([] as { value: number }[]),
  ]);
  let dmsToMet = 0;
  if (kinds.has('dm') && connRows.length) {
    const partners = connRows.map((c) => (c.a === userId ? c.b : c.a));
    dmsToMet = await countDmsToPartners(userId, partners);
  }
  return {
    checkedIn: checkinRows.length > 0,
    connections: connRows.length,
    follows: Number(followRows[0]?.value ?? 0),
    dmsToMet,
  };
}

/** The viewer's quest state for an event. Satisfied auto quests are
 * materialized into event_quest_completions (idempotent via the unique
 * index) so raffle, progress, and passport stamps all read one table.
 * Incomplete counted quests carry live {current, target} progress so the
 * UI can show "3/5" instead of a bare unchecked circle. */
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
  let ctx: AutoContext | null = null;
  if (pendingAuto.length) {
    const kinds = new Set(pendingAuto.map((q) => (q.rule as AutoRule | null)?.kind).filter(Boolean) as string[]);
    ctx = await autoContext(eventId, userId, kinds);
    const satisfied = pendingAuto.filter((q) => evaluateAutoRule(q.rule as AutoRule, ctx!));
    if (satisfied.length) {
      const rows = await db.insert(eventQuestCompletions)
        .values(satisfied.map((q) => ({ questId: q.id, eventId, userId })))
        .onConflictDoNothing()
        .returning({ questId: eventQuestCompletions.questId, at: eventQuestCompletions.createdAt });
      for (const r of rows) doneAt.set(r.questId, r.at);
    }
  }

  // No `code` in the attendee payload — QR quest codes are secrets.
  const list = quests.map((q) => {
    const rule = q.rule as AutoRule | null;
    const completed = doneAt.has(q.id);
    const current = !completed && ctx ? ruleProgressValue(rule, ctx) : null;
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      icon: q.icon,
      verifyMethod: q.verifyMethod,
      rule,
      completed,
      completedAt: doneAt.get(q.id) ?? null,
      progress: current == null ? null : { current, target: ruleTarget(rule) },
    };
  });
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

  const autoQuests = quests.filter((q) => q.verifyMethod === 'auto');
  const kinds = new Set(autoQuests.map((q) => (q.rule as AutoRule | null)?.kind).filter(Boolean) as string[]);
  const needConns = kinds.has('connections') || kinds.has('dm');

  const [completions, checkins, conns] = await Promise.all([
    db.select({ questId: eventQuestCompletions.questId, userId: eventQuestCompletions.userId })
      .from(eventQuestCompletions).where(eq(eventQuestCompletions.eventId, eventId)),
    db.select({ userId: eventCheckins.userId }).from(eventCheckins).where(eq(eventCheckins.eventId, eventId)),
    needConns
      ? db.select({ a: eventConnections.userAId, b: eventConnections.userBId })
          .from(eventConnections).where(eq(eventConnections.eventId, eventId))
      : Promise.resolve([] as { a: string; b: string }[]),
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
  const participantIds = Array.from(participants);

  // Batched signals for the newer rule kinds, only when a quest uses them.
  const followCount = new Map<string, number>();
  if (kinds.has('follows') && participantIds.length) {
    const rows = await db.select({ followerId: follows.followerId, value: count() }).from(follows)
      .where(inArray(follows.followerId, participantIds))
      .groupBy(follows.followerId);
    for (const r of rows) followCount.set(r.followerId, Number(r.value));
  }
  const dmCount = new Map<string, number>();
  if (kinds.has('dm') && conns.length) {
    // One pass over the event's meet-pairs: which side of each pair has sent
    // a message in that pair's (unique) conversation?
    const pairByKey = new Map(conns.map((c) => [dmKey(c.a, c.b), c]));
    const convs = await db.select({ id: conversations.id, dmKey: conversations.dmKey }).from(conversations)
      .where(inArray(conversations.dmKey, Array.from(pairByKey.keys())));
    if (convs.length) {
      const senders = await db
        .select({ conversationId: messages.conversationId, senderId: messages.senderId })
        .from(messages)
        .where(inArray(messages.conversationId, convs.map((c) => c.id)))
        .groupBy(messages.conversationId, messages.senderId);
      const pairByConv = new Map(convs.map((c) => [c.id, pairByKey.get(c.dmKey ?? '')]));
      for (const s of senders) {
        const pair = pairByConv.get(s.conversationId);
        if (!pair) continue;
        if (s.senderId === pair.a || s.senderId === pair.b) {
          dmCount.set(s.senderId, (dmCount.get(s.senderId) ?? 0) + 1);
        }
      }
    }
  }

  const raw = participantIds.map((userId) => {
    const stored = doneByUser.get(userId) ?? new Set<string>();
    let completedCount = stored.size;
    const ctx: AutoContext = {
      checkedIn: checkedIn.has(userId),
      connections: connCount.get(userId) ?? 0,
      follows: followCount.get(userId) ?? 0,
      dmsToMet: dmCount.get(userId) ?? 0,
    };
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
