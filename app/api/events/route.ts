import { NextRequest, NextResponse } from 'next/server';
import { db, events, users, eventHosts, eventRsvps, worlds } from '@/lib/db';
import { eq, asc, and, isNotNull, count, sql, inArray } from 'drizzle-orm';

// Title-case normalize: "los angeles" → "Los Angeles"
function titleCase(str: string): string {
  return str.trim().split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Fetch hosts for a list of event IDs
async function getHostsForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return {};
  const rows = await db
    .select({
      eventId: eventHosts.eventId,
      userId: eventHosts.userId,
      role: eventHosts.role,
      worldId: eventHosts.worldId,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
      worldTitle: worlds.title,
      worldSlug: worlds.slug,
      worldImageUrl: worlds.imageUrl,
    })
    .from(eventHosts)
    .leftJoin(users, eq(eventHosts.userId, users.id))
    .leftJoin(worlds, eq(eventHosts.worldId, worlds.id))
    .where(inArray(eventHosts.eventId, eventIds));

  const map: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!map[row.eventId]) map[row.eventId] = [];
    map[row.eventId].push(row);
  }
  return map;
}

// Fetch RSVP counts for a list of event IDs
async function getRsvpCounts(eventIds: string[]) {
  if (eventIds.length === 0) return {};
  const rows = await db
    .select({ eventId: eventRsvps.eventId, count: count() })
    .from(eventRsvps)
    .where(inArray(eventRsvps.eventId, eventIds))
    .groupBy(eventRsvps.eventId);

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.eventId] = row.count;
  }
  return map;
}

// GET /api/events — list published events, filter by slug or city, return distinct cities
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const citiesOnly = request.nextUrl.searchParams.get('cities');
    const hostUserId = request.nextUrl.searchParams.get('hostUserId');
    const worldId = request.nextUrl.searchParams.get('worldId');
    const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');

    // Return distinct cities list
    if (citiesOnly === 'true') {
      const rows = await db
        .selectDistinct({ city: events.city })
        .from(events)
        .where(and(eq(events.published, true), isNotNull(events.city)));
      const cities = rows.map(r => r.city).filter(Boolean).sort() as string[];
      return NextResponse.json({ cities });
    }

    const eventSelect = {
      id: events.id,
      eventName: events.eventName,
      slug: events.slug,
      description: events.description,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
      link: events.link,
      imageUrl: events.imageUrl,
      createdBy: events.createdBy,
      published: events.published,
      createdAt: events.createdAt,
      creatorName: users.name,
      creatorUsername: users.username,
    };

    // Single event by slug — include full host details
    if (slug) {
      const results = await db
        .select(eventSelect)
        .from(events)
        .leftJoin(users, eq(events.createdBy, users.id))
        .where(eq(events.slug, slug));

      if (results.length === 0) {
        return NextResponse.json({ events: [] });
      }

      const eventIds = results.map(e => e.id);
      const hostsMap = await getHostsForEvents(eventIds);
      const rsvpMap = await getRsvpCounts(eventIds);

      // Check if viewer has RSVP'd
      let userRsvped = false;
      if (viewerPrivyId) {
        const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId));
        if (viewer) {
          const [rsvp] = await db.select({ id: eventRsvps.id }).from(eventRsvps)
            .where(and(eq(eventRsvps.eventId, results[0].id), eq(eventRsvps.userId, viewer.id)));
          userRsvped = !!rsvp;
        }
      }

      // Check if viewer is a host
      let isHost = false;
      if (viewerPrivyId) {
        const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId));
        if (viewer) {
          const [host] = await db.select({ id: eventHosts.id }).from(eventHosts)
            .where(and(eq(eventHosts.eventId, results[0].id), eq(eventHosts.userId, viewer.id)));
          isHost = !!host;
        }
      }

      const enriched = results.map(e => ({
        ...e,
        hosts: hostsMap[e.id] || [],
        rsvpCount: rsvpMap[e.id] || 0,
        userRsvped,
        isHost,
      }));

      return NextResponse.json({ events: enriched });
    }

    // Events by host user ID (for profiles)
    if (hostUserId) {
      const hostEventIds = await db
        .select({ eventId: eventHosts.eventId })
        .from(eventHosts)
        .where(eq(eventHosts.userId, hostUserId));

      if (hostEventIds.length === 0) {
        return NextResponse.json({ events: [] });
      }

      const ids = hostEventIds.map(r => r.eventId);
      const results = await db
        .select(eventSelect)
        .from(events)
        .leftJoin(users, eq(events.createdBy, users.id))
        .where(and(eq(events.published, true), inArray(events.id, ids)))
        .orderBy(asc(events.dateIso));

      const hostsMap = await getHostsForEvents(ids);
      const rsvpMap = await getRsvpCounts(ids);
      const enriched = results.map(e => ({
        ...e,
        hosts: hostsMap[e.id] || [],
        rsvpCount: rsvpMap[e.id] || 0,
      }));

      return NextResponse.json({ events: enriched });
    }

    // Events by world ID (for world profiles)
    if (worldId) {
      const worldEventIds = await db
        .select({ eventId: eventHosts.eventId })
        .from(eventHosts)
        .where(eq(eventHosts.worldId, worldId));

      if (worldEventIds.length === 0) {
        return NextResponse.json({ events: [] });
      }

      const ids = worldEventIds.map(r => r.eventId);
      const results = await db
        .select(eventSelect)
        .from(events)
        .leftJoin(users, eq(events.createdBy, users.id))
        .where(and(eq(events.published, true), inArray(events.id, ids)))
        .orderBy(asc(events.dateIso));

      const hostsMap = await getHostsForEvents(ids);
      const rsvpMap = await getRsvpCounts(ids);
      const enriched = results.map(e => ({
        ...e,
        hosts: hostsMap[e.id] || [],
        rsvpCount: rsvpMap[e.id] || 0,
      }));

      return NextResponse.json({ events: enriched });
    }

    // Default listing — all published events
    const cityFilter = request.nextUrl.searchParams.get('city');

    const conditions = [eq(events.published, true)];
    if (cityFilter) {
      conditions.push(eq(events.city, cityFilter));
    }

    const results = await db
      .select(eventSelect)
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(asc(events.dateIso));

    const eventIds = results.map(e => e.id);
    const hostsMap = await getHostsForEvents(eventIds);
    const rsvpMap = await getRsvpCounts(eventIds);
    const enriched = results.map(e => ({
      ...e,
      hosts: hostsMap[e.id] || [],
      rsvpCount: rsvpMap[e.id] || 0,
    }));

    return NextResponse.json({ events: enriched });
  } catch (error) {
    console.error('GET events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/events — create a new event (requires auth)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.privyId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!data.eventName || !data.slug) {
      return NextResponse.json({ error: 'Event name and slug are required' }, { status: 400 });
    }

    // Resolve user
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const city = data.city ? titleCase(data.city) : null;

    const result = await db.insert(events).values({
      eventName: data.eventName,
      slug: data.slug,
      description: data.description || null,
      date: data.date || null,
      dateIso: data.dateIso || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      timezone: data.timezone || null,
      city,
      address: data.address || null,
      link: data.link || null,
      imageUrl: data.imageUrl || null,
      createdBy: user.id,
      published: true,
    }).returning();

    // Auto-create host row for the creator
    await db.insert(eventHosts).values({
      eventId: result[0].id,
      userId: user.id,
      role: 'creator',
      worldId: data.worldId || null,
    });

    return NextResponse.json({ event: result[0] }, { status: 201 });
  } catch (error) {
    console.error('POST event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

// PUT /api/events — update an event (hosts only)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.privyId || !data.eventId) {
      return NextResponse.json({ error: 'Missing privyId or eventId' }, { status: 400 });
    }

    // Resolve user
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user is a host
    const [host] = await db.select({ id: eventHosts.id }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, data.eventId), eq(eventHosts.userId, user.id)));
    if (!host) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const city = data.city ? titleCase(data.city) : null;

    const result = await db.update(events).set({
      eventName: data.eventName,
      slug: data.slug,
      description: data.description || null,
      date: data.date || null,
      dateIso: data.dateIso || null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      timezone: data.timezone || null,
      city,
      address: data.address || null,
      link: data.link || null,
      imageUrl: data.imageUrl || null,
    }).where(eq(events.id, data.eventId)).returning();

    return NextResponse.json({ event: result[0] });
  } catch (error) {
    console.error('PUT event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
