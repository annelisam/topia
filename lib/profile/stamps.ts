import { db } from '@/lib/db';
import { eventRsvps, events, tickets, guestbookEntries, tools, eventInvites, worldMembers, follows, users } from '@/lib/db/schema';
import { and, eq, inArray, asc, isNotNull } from 'drizzle-orm';
import { resolvePath, PATH_CONFIG } from '@/app/components/profile/pathConfig';

export type StampRarity = 'common' | 'rare' | 'legendary';

export interface ProfileStamp {
  /** Center / main label (event or world name, or the stamp's headline word). */
  label: string;
  /** The word stamped around the ring / across the top (the stamp's "type"). */
  caption: string;
  date: string;
  color: string;            // COLOR_HEX key: lime | blue | pink | orange | green | silver
  shape: 'circle' | 'rect' | 'seal';
  rarity: StampRarity;
  weight: number;           // drives size + opacity (legendary biggest/boldest)
  emblem?: 'topia' | 'star'; // central glyph for seal-shaped stamps
  title: string;            // human title shown in the detail modal
  description: string;      // short blurb shown in the detail modal
  avatarUrl?: string;       // for connection ("Orbit") stamps — the person's PFP
  href?: string;            // link to that person's profile (shown in the modal)
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

interface Membership { worldId: string; worldTitle: string; worldSlug?: string; role: string }

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

  const [rsvpRows, checkIns, gbRows, toolRows, invites, worldMemberRows, followingRows, followerRows] = await Promise.all([
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
    // People this user follows.
    db.select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, at: follows.createdAt })
      .from(follows).innerJoin(users, eq(follows.followingId, users.id)).where(eq(follows.followerId, userId)),
    // People who follow this user.
    db.select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, at: follows.createdAt })
      .from(follows).innerJoin(users, eq(follows.followerId, users.id)).where(eq(follows.followingId, userId)),
  ]);

  const stamps: ProfileStamp[] = [];
  const add = (s: Omit<ProfileStamp, 'weight'>) => stamps.push({ ...s, weight: WEIGHT[s.rarity] });

  // ── TOPIA member — a special seal for members of the TOPIA world ───────────
  const inTopia = worldMemberships.some(
    (w) => (w.worldTitle || '').trim().toUpperCase() === 'TOPIA' || (w.worldSlug || '').toLowerCase() === 'topia',
  );
  if (inTopia) {
    add({ label: 'TOPIA', caption: 'MEMBER', date: ym(opts.createdAt), color: 'silver', shape: 'seal', rarity: 'legendary', emblem: 'topia',
      title: 'TOPIA Member', description: 'A member of TOPIA — the world at the center of it all. The rarest seal on the passport.' });
  }

  // ── TOPIA Like Minds — RSVP'd to the flagship gathering ────────────────────
  const likeMinds = rsvpRows.find((r) => /like\s*minds/i.test(r.name));
  if (likeMinds) {
    add({ label: 'LIKE MINDS', caption: 'TOPIA', date: ym(likeMinds.dateIso ?? likeMinds.at), color: 'lime', shape: 'seal', rarity: 'legendary', emblem: 'topia',
      title: 'TOPIA Like Minds', description: "RSVP'd to TOPIA Like Minds — in the room with the others." });
  }

  // ── Path seal — everyone has a resolved path ───────────────────────────────
  const path = resolvePath(opts.path, roleTagList, hasOwnedWorlds);
  const pathCfg = PATH_CONFIG[path];
  const pathBrand = pathCfg.color === 'blue' ? 'cyan' : pathCfg.color === 'pink' ? 'magenta' : pathCfg.color;
  add({ label: pathCfg.label, caption: 'OFFICIAL SEAL', date: ym(opts.createdAt), color: pathBrand, shape: 'seal', rarity: 'rare', emblem: 'star',
    title: `${pathCfg.label} Seal`, description: 'Your official path seal — the lane you build in across TOPIA.' });

  // ── Early citizen ──────────────────────────────────────────────────────────
  if (new Date(opts.createdAt) <= BETA_CUTOFF) {
    add({ label: 'BETA', caption: 'EARLY CITIZEN', date: ym(opts.createdAt), color: 'orange', shape: 'circle', rarity: 'legendary',
      title: 'Early Citizen', description: 'Joined TOPIA during the beta — here before it was here.' });
  }

  // ── Profile complete (renamed from "Completionist" → "Certified") ──────────
  if (opts.avatarUrl && opts.bio && roleTagList.length > 0 && opts.path) {
    add({ label: 'PROFILE', caption: 'CERTIFIED', date: ym(opts.createdAt), color: 'lime', shape: 'circle', rarity: 'common',
      title: 'Certified', description: 'Completed your profile — photo, story, and path all in place.' });
  }

  // ── Founder — owns a world ─────────────────────────────────────────────────
  worldMemberships.filter((w) => w.role === 'owner').slice(0, 2).forEach((w) => {
    add({ label: w.worldTitle.toUpperCase().slice(0, 14), caption: 'FOUNDER', date: ym(opts.createdAt), color: 'lime', shape: 'circle', rarity: 'legendary',
      title: 'Founder', description: `Founded ${w.worldTitle} and shaped it from day one.` });
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
    add({ label: bestSettler.world.toUpperCase().slice(0, 14), caption: 'SETTLER', date: ym(bestSettler.at), color: 'orange', shape: 'rect', rarity: 'rare',
      title: 'Settler', description: `Among the first to join ${bestSettler.world} — an early believer.` });
  }

  // ── Events: first stamp + frequent flyer + check-in ────────────────────────
  if (rsvpRows.length > 0) {
    const first = rsvpRows[0];
    add({ label: first.name.toUpperCase().slice(0, 14), caption: 'FIRST STAMP', date: ym(first.dateIso ?? first.at), color: 'cyan', shape: 'circle', rarity: 'common',
      title: 'First Stamp', description: `Your very first RSVP — ${first.name}. Every passport starts somewhere.` });
  }
  if (rsvpRows.length >= FF_COMMON) {
    const rarity: StampRarity = rsvpRows.length >= FF_LEGENDARY ? 'legendary' : rsvpRows.length >= FF_RARE ? 'rare' : 'common';
    add({ label: `${rsvpRows.length} EVENTS`, caption: 'FREQUENT FLYER', date: 'MILES', color: 'purple', shape: 'circle', rarity,
      title: 'Frequent Flyer', description: `RSVP'd to ${rsvpRows.length} events. A regular on the circuit.` });
  }
  if (checkIns.length > 0) {
    const latest = checkIns.reduce((a, b) => (new Date(b.at!) > new Date(a.at!) ? b : a));
    add({ label: checkIns.length > 1 ? `${checkIns.length}× ON-SITE` : latest.name.toUpperCase().slice(0, 12), caption: 'CHECK-IN', date: ym(latest.at), color: 'cyan', shape: 'rect', rarity: 'rare',
      title: 'Checked In', description: 'Showed up and checked in on-site. Presence verified.' });
  }

  // ── Connector — invited someone who joined ─────────────────────────────────
  if (invites.length > 0) {
    add({ label: `${invites.length} BROUGHT`, caption: 'CONNECTOR', date: 'TOPIA', color: 'magenta', shape: 'rect', rarity: 'rare',
      title: 'Connector', description: `Brought ${invites.length} ${invites.length === 1 ? 'person' : 'people'} into TOPIA through an invite.` });
  }

  // ── Guestbook — signed at least one guestbook ──────────────────────────────
  if (gbRows.length > 0) {
    add({ label: 'SIGNED', caption: 'GUESTBOOK', date: gbRows.length > 1 ? `${gbRows.length}×` : 'TOPIA', color: 'magenta', shape: 'rect', rarity: 'common',
      title: 'Guestbook', description: 'Signed a guestbook and left your mark on someone’s profile.' });
  }

  // ── Toolmaker — contributed a tool to Resources ────────────────────────────
  if (toolRows.length > 0) {
    add({ label: toolRows.length > 1 ? `${toolRows.length} TOOLS` : toolRows[0].name.toUpperCase().slice(0, 12), caption: 'TOOLMAKER', date: 'BUILD', color: 'purple', shape: 'rect', rarity: 'rare',
      title: 'Toolmaker', description: 'Contributed a tool to the TOPIA Resources library.' });
  }

  // ── Orbit — a stamp for everyone in your network (you follow / follows you) ─
  const conns = new Map<string, { name: string | null; username: string | null; avatarUrl: string | null; at: Date; iFollow: boolean; followsMe: boolean }>();
  for (const f of followingRows) {
    if (f.id === userId) continue;
    conns.set(f.id, { name: f.name, username: f.username, avatarUrl: f.avatarUrl, at: f.at, iFollow: true, followsMe: false });
  }
  for (const f of followerRows) {
    if (f.id === userId) continue;
    const e = conns.get(f.id);
    if (e) e.followsMe = true;
    else conns.set(f.id, { name: f.name, username: f.username, avatarUrl: f.avatarUrl, at: f.at, iFollow: false, followsMe: true });
  }
  // Only mutual follows earn an Orbit stamp. Subtle, mixed colors.
  const ORBIT_COLORS = ['dust', 'slate', 'sage', 'mauveGrey', 'clayGrey'];
  [...conns.values()].filter((p) => p.username && p.iFollow && p.followsMe).slice(0, 12).forEach((p, i) => {
    add({ label: (p.name || p.username || '').toUpperCase().slice(0, 12), caption: 'ORBIT', date: ym(p.at), color: ORBIT_COLORS[i % ORBIT_COLORS.length], shape: 'rect', rarity: 'common',
      title: p.name || `@${p.username}`, description: `You and @${p.username} follow each other.`, avatarUrl: p.avatarUrl ?? undefined, href: `/profile/${p.username}` });
  });

  // Rarest first, then by insertion order (stable).
  return stamps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => RARITY_RANK[a.s.rarity] - RARITY_RANK[b.s.rarity] || a.i - b.i)
    .map(({ s }) => s)
    .slice(0, 30);
}
