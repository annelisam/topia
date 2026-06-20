import { db } from '@/lib/db';
import { eventRsvps, events, tickets, guestbookEntries, tools, eventInvites, worldMembers } from '@/lib/db/schema';
import { and, eq, inArray, asc, isNotNull } from 'drizzle-orm';
import { resolvePath, PATH_CONFIG } from '@/app/components/profile/pathConfig';

export type StampRarity = 'common' | 'rare' | 'legendary';

export interface ProfileStamp {
  /** Center / main label (event or world name, or the stamp's headline word). */
  label: string;
  /** The word stamped around the ring / across the top (the stamp's "type"). */
  caption: string;
  date: string;
  color: string;            // COLOR_HEX key: lime | blue | pink | orange | green
  shape: 'circle' | 'rect';
  rarity: StampRarity;
  weight: number;           // drives size + opacity (legendary biggest/boldest)
}

// Anyone who joins before this date is an "Early Citizen" of the beta.
// Generous for now (everyone in the beta qualifies) — tighten when beta ends.
const BETA_CUTOFF = new Date('2026-12-31T23:59:59Z');
// First N members of a world (by join time) earn the Settler stamp.
const SETTLER_N = 10;
// Frequent-flyer tiers by number of events RSVP'd.
const FF_LEGENDARY = 25, FF_RARE = 10, FF_COMMON = 5;

const WEIGHT: Record<StampRarity, number> = { legendary: 1, rare: 0.82, common: 0.66 };
const RARITY_RANK: Record<StampRarity, number> = { legendary: 0, rare: 1, common: 2 };

function ym(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const m = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${m} '${String(date.getFullYear()).slice(2)}`;
}

interface Membership { worldId: string; worldTitle: string; role: string }

/**
 * Compute the passport stamps a user has earned. Pure reads — no migrations,
 * every column already exists. Returns stamps ordered rarest-first.
 */
export async function computeProfileStamps(opts: {
  userId: string;
  createdAt: Date | string;
  avatarUrl: string | null;
  bio: string | null;
  roleTags: string | null;
  path: string | null;
  worldMemberships: Membership[];
}): Promise<ProfileStamp[]> {
  const { userId, worldMemberships } = opts;
  const worldIds = worldMemberships.map((w) => w.worldId);
  const roleTagList = (opts.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const hasOwnedWorlds = worldMemberships.some((w) => w.role === 'owner' || w.role === 'world_builder');

  const [rsvpRows, checkIns, gbRows, toolRows, invites, worldMemberRows] = await Promise.all([
    db.select({ name: events.eventName, dateIso: events.dateIso, at: eventRsvps.createdAt })
      .from(eventRsvps).innerJoin(events, eq(eventRsvps.eventId, events.id))
      .where(and(eq(eventRsvps.userId, userId), eq(eventRsvps.status, 'going')))
      .orderBy(asc(eventRsvps.createdAt)),
    db.select({ name: events.eventName, at: tickets.checkedInAt })
      .from(tickets).innerJoin(events, eq(tickets.eventId, events.id))
      .where(and(eq(tickets.ownerId, userId), isNotNull(tickets.checkedInAt))),
    db.select({ id: guestbookEntries.id }).from(guestbookEntries).where(eq(guestbookEntries.authorUserId, userId)),
    db.select({ name: tools.name }).from(tools).where(eq(tools.submittedBy, userId)),
    db.select({ id: eventInvites.id }).from(eventInvites)
      .where(and(eq(eventInvites.invitedBy, userId), eq(eventInvites.status, 'accepted'))),
    worldIds.length
      ? db.select({ worldId: worldMembers.worldId, userId: worldMembers.userId, at: worldMembers.createdAt })
          .from(worldMembers).where(inArray(worldMembers.worldId, worldIds))
      : Promise.resolve([] as { worldId: string; userId: string; at: Date }[]),
  ]);

  const stamps: ProfileStamp[] = [];
  const add = (s: Omit<ProfileStamp, 'weight'>) => stamps.push({ ...s, weight: WEIGHT[s.rarity] });

  // ── Path seal — everyone has a resolved path ───────────────────────────────
  const path = resolvePath(opts.path, roleTagList, hasOwnedWorlds);
  const pathCfg = PATH_CONFIG[path];
  add({ label: 'SEAL', caption: pathCfg.label, date: ym(opts.createdAt), color: pathCfg.color, shape: 'circle', rarity: 'rare' });

  // ── Early citizen ──────────────────────────────────────────────────────────
  if (new Date(opts.createdAt) <= BETA_CUTOFF) {
    add({ label: 'BETA', caption: 'EARLY CITIZEN', date: ym(opts.createdAt), color: 'orange', shape: 'circle', rarity: 'legendary' });
  }

  // ── Profile complete (renamed from "Completionist" → "Certified") ──────────
  if (opts.avatarUrl && opts.bio && roleTagList.length > 0 && opts.path) {
    add({ label: 'PROFILE', caption: 'CERTIFIED', date: ym(opts.createdAt), color: 'lime', shape: 'circle', rarity: 'common' });
  }

  // ── Founder — owns a world ─────────────────────────────────────────────────
  worldMemberships.filter((w) => w.role === 'owner').slice(0, 2).forEach((w) => {
    add({ label: w.worldTitle.toUpperCase().slice(0, 14), caption: 'FOUNDER', date: ym(opts.createdAt), color: 'lime', shape: 'circle', rarity: 'legendary' });
  });

  // ── Settler — among the first members of a world (excludes owned worlds) ────
  let bestSettler: { world: string; rank: number; at: Date } | null = null;
  for (const m of worldMemberships) {
    if (m.role === 'owner') continue;
    const members = worldMemberRows
      .filter((r) => r.worldId === m.worldId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const idx = members.findIndex((r) => r.userId === userId);
    if (idx >= 0 && idx < SETTLER_N && (!bestSettler || idx < bestSettler.rank)) {
      bestSettler = { world: m.worldTitle, rank: idx, at: members[idx].at };
    }
  }
  if (bestSettler) {
    add({ label: bestSettler.world.toUpperCase().slice(0, 14), caption: 'SETTLER', date: ym(bestSettler.at), color: 'orange', shape: 'rect', rarity: 'rare' });
  }

  // ── Events: first stamp + frequent flyer + check-in ────────────────────────
  if (rsvpRows.length > 0) {
    const first = rsvpRows[0];
    add({ label: first.name.toUpperCase().slice(0, 14), caption: 'FIRST STAMP', date: ym(first.dateIso ?? first.at), color: 'green', shape: 'circle', rarity: 'common' });
  }
  if (rsvpRows.length >= FF_COMMON) {
    const rarity: StampRarity = rsvpRows.length >= FF_LEGENDARY ? 'legendary' : rsvpRows.length >= FF_RARE ? 'rare' : 'common';
    add({ label: `${rsvpRows.length} EVENTS`, caption: 'FREQUENT FLYER', date: 'MILES', color: 'blue', shape: 'circle', rarity });
  }
  if (checkIns.length > 0) {
    const latest = checkIns.reduce((a, b) => (new Date(b.at!) > new Date(a.at!) ? b : a));
    add({ label: checkIns.length > 1 ? `${checkIns.length}× ON-SITE` : latest.name.toUpperCase().slice(0, 12), caption: 'CHECK-IN', date: ym(latest.at), color: 'green', shape: 'rect', rarity: 'rare' });
  }

  // ── Connector — invited someone who joined ─────────────────────────────────
  if (invites.length > 0) {
    add({ label: `${invites.length} BROUGHT`, caption: 'CONNECTOR', date: 'TOPIA', color: 'pink', shape: 'rect', rarity: 'rare' });
  }

  // ── Guestbook — signed at least one guestbook ──────────────────────────────
  if (gbRows.length > 0) {
    add({ label: 'SIGNED', caption: 'GUESTBOOK', date: gbRows.length > 1 ? `${gbRows.length}×` : 'TOPIA', color: 'pink', shape: 'rect', rarity: 'common' });
  }

  // ── Toolmaker — contributed a tool to Resources ────────────────────────────
  if (toolRows.length > 0) {
    add({ label: toolRows.length > 1 ? `${toolRows.length} TOOLS` : toolRows[0].name.toUpperCase().slice(0, 12), caption: 'TOOLMAKER', date: 'BUILD', color: 'blue', shape: 'rect', rarity: 'rare' });
  }

  // Rarest first, then by insertion order (stable).
  return stamps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => RARITY_RANK[a.s.rarity] - RARITY_RANK[b.s.rarity] || a.i - b.i)
    .map(({ s }) => s)
    .slice(0, 30);
}
