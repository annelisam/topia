import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  users, follows, worldMembers, eventHosts, events, worlds,
  worldInvitations, eventHostInvitations, eventRsvps, notifications, tools,
} from '@/lib/db/schema';
import { eq, and, gte, count, or, isNotNull, asc, desc, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * GET /api/dashboard/overview?privyId=...
 *
 * Single batched endpoint for the entire dashboard page. Runs all the
 * queries the individual widgets used to make on the client — but in
 * parallel server-side, returning one JSON blob. Cuts ~5 HTTP round
 * trips down to 1.
 */
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!privyId) return NextResponse.json(empty());

  try {
    const [user] = await db
      .select({ id: users.id, savedToolSlugs: users.savedToolSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!user) return NextResponse.json(empty());

    const todayIso = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inviters = alias(users, 'inviters');
    const actors   = alias(users, 'actors');

    const savedSlugs = (user.savedToolSlugs ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // Run everything in parallel — single connection pool, one round trip
    const [
      // Stats
      followers, following, followersDelta,
      worldsCount, worldsDelta,
      eventsCount, eventsDelta,

      // Invitations
      worldInvites, eventInvites,

      // Upcoming events (hosting + attending — merged client-side here)
      hostingEvents, attendingEvents,

      // Notifications
      recentNotifs,

      // Saved tools (resolved)
      savedTools,
    ] = await Promise.all([
      // ── Stats: 5 quick counts
      db.select({ value: count() }).from(follows).where(eq(follows.followingId, user.id)),
      db.select({ value: count() }).from(follows).where(eq(follows.followerId, user.id)),
      db.select({ value: count() }).from(follows).where(and(eq(follows.followingId, user.id), gte(follows.createdAt, thirtyDaysAgo))),
      db.select({ value: count() }).from(worldMembers).where(eq(worldMembers.userId, user.id)),
      db.select({ value: count() }).from(worldMembers).where(and(eq(worldMembers.userId, user.id), gte(worldMembers.createdAt, thirtyDaysAgo))),
      db.select({ value: count() }).from(events).leftJoin(eventHosts, eq(events.id, eventHosts.eventId)).where(or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id))),
      db.select({ value: count() }).from(events).leftJoin(eventHosts, eq(events.id, eventHosts.eventId)).where(and(or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id)), gte(events.createdAt, thirtyDaysAgo))),

      // ── World invites
      db
        .select({
          id: worldInvitations.id,
          role: worldInvitations.role,
          createdAt: worldInvitations.createdAt,
          worldTitle: worlds.title,
          worldSlug: worlds.slug,
          worldImageUrl: worlds.imageUrl,
          inviterName: inviters.name,
          inviterUsername: inviters.username,
          inviterAvatar: inviters.avatarUrl,
        })
        .from(worldInvitations)
        .innerJoin(worlds, eq(worldInvitations.worldId, worlds.id))
        .innerJoin(inviters, eq(worldInvitations.inviterId, inviters.id))
        .where(and(eq(worldInvitations.inviteeId, user.id), eq(worldInvitations.status, 'pending')))
        .orderBy(desc(worldInvitations.createdAt)),

      // ── Event co-host invites
      db
        .select({
          id: eventHostInvitations.id,
          createdAt: eventHostInvitations.createdAt,
          eventName: events.eventName,
          eventSlug: events.slug,
          eventImageUrl: events.imageUrl,
          eventDate: events.date,
          inviterName: inviters.name,
          inviterUsername: inviters.username,
          inviterAvatar: inviters.avatarUrl,
        })
        .from(eventHostInvitations)
        .innerJoin(events, eq(eventHostInvitations.eventId, events.id))
        .innerJoin(inviters, eq(eventHostInvitations.inviterId, inviters.id))
        .where(and(eq(eventHostInvitations.inviteeId, user.id), eq(eventHostInvitations.status, 'pending')))
        .orderBy(desc(eventHostInvitations.createdAt)),

      // ── Upcoming hosting
      db
        .select({
          id: events.id, eventName: events.eventName, slug: events.slug,
          dateIso: events.dateIso, date: events.date,
          startTime: events.startTime, city: events.city, imageUrl: events.imageUrl,
        })
        .from(events)
        .leftJoin(eventHosts, eq(events.id, eventHosts.eventId))
        .where(and(
          or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id)),
          isNotNull(events.dateIso),
          gte(events.dateIso, todayIso),
          eq(events.published, true),
        ))
        .orderBy(asc(events.dateIso))
        .limit(20),

      // ── Upcoming attending
      db
        .select({
          id: events.id, eventName: events.eventName, slug: events.slug,
          dateIso: events.dateIso, date: events.date,
          startTime: events.startTime, city: events.city, imageUrl: events.imageUrl,
        })
        .from(events)
        .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
        .where(and(
          eq(eventRsvps.userId, user.id),
          isNotNull(events.dateIso),
          gte(events.dateIso, todayIso),
          eq(events.published, true),
        ))
        .orderBy(asc(events.dateIso))
        .limit(20),

      // ── Recent notifications (with actor info)
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          read: notifications.read,
          createdAt: notifications.createdAt,
          actorId: notifications.actorId,
          actorName: actors.name,
          actorUsername: actors.username,
          actorAvatar: actors.avatarUrl,
          metadata: notifications.metadata,
        })
        .from(notifications)
        .innerJoin(actors, eq(notifications.actorId, actors.id))
        .where(eq(notifications.recipientId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20),

      // ── Saved tools resolved by slug
      savedSlugs.length === 0
        ? Promise.resolve([] as { id: string; name: string; slug: string; url: string | null; category: string | null }[])
        : db
            .select({ id: tools.id, name: tools.name, slug: tools.slug, url: tools.url, category: tools.category })
            .from(tools)
            .where(inArray(tools.slug, savedSlugs)),
    ]);

    // Merge hosting + attending events, dedupe, sort, top 6
    const eventMap = new Map<string, { id: string; eventName: string; slug: string; dateIso: string | null; date: string | null; startTime: string | null; city: string | null; imageUrl: string | null; role: 'hosting' | 'attending' }>();
    for (const e of hostingEvents) eventMap.set(e.id, { ...e, role: 'hosting' });
    for (const e of attendingEvents) if (!eventMap.has(e.id)) eventMap.set(e.id, { ...e, role: 'attending' });
    const upcoming = [...eventMap.values()]
      .sort((a, b) => (a.dateIso ?? '').localeCompare(b.dateIso ?? ''))
      .slice(0, 6);

    // Preserve savedSlugs ordering
    const savedToolsMap = new Map(savedTools.map((t) => [t.slug, t]));
    const orderedSavedTools = savedSlugs.map((s) => savedToolsMap.get(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json({
      stats: {
        followers: followers[0]?.value ?? 0,
        following: following[0]?.value ?? 0,
        worlds:    worldsCount[0]?.value ?? 0,
        events:    eventsCount[0]?.value ?? 0,
        deltas: {
          followers: followersDelta[0]?.value ?? 0,
          worlds:    worldsDelta[0]?.value ?? 0,
          events:    eventsDelta[0]?.value ?? 0,
        },
      },
      invitations: {
        worldInvitations: worldInvites,
        eventInvitations: eventInvites,
        total: worldInvites.length + eventInvites.length,
      },
      upcoming,
      notifications: recentNotifs,
      savedTools: orderedSavedTools,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(empty());
  }
}

function empty() {
  return {
    stats: { followers: 0, following: 0, worlds: 0, events: 0, deltas: {} },
    invitations: { worldInvitations: [], eventInvitations: [], total: 0 },
    upcoming: [],
    notifications: [],
    savedTools: [],
  };
}
