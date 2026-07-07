import { db } from '@/lib/db';
import { users, events, eventHosts, eventRsvps, worlds } from '@/lib/db/schema';
import { eq, and, asc, inArray, count } from 'drizzle-orm';

/**
 * Everything the /events page needs in one round-trip: published events
 * (sorted by dateIso asc), distinct cities, and — when privyId resolves to a
 * user — their RSVP / hosting / saved flags. Shared by the
 * /api/events/overview route and the server-rendered /events page (which
 * calls it anonymously so the list is in the initial HTML).
 */
export async function getEventsOverview({
  privyId,
  city,
}: {
  privyId?: string | null;
  city?: string | null;
} = {}) {
  // Resolve user
  let user: { id: string; savedEventSlugs: string | null } | null = null;
  if (privyId) {
    const [u] = await db
      .select({ id: users.id, savedEventSlugs: users.savedEventSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    user = u ?? null;
  }

  // Base where (published only, plus optional city)
  const where = city
    ? and(eq(events.published, true), eq(events.city, city))
    : eq(events.published, true);

  // Pull events (left-join users on createdBy so we can show "Shared by @x"
  // attribution on external events)
  const eventRows = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      slug: events.slug,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
      link: events.link,
      imageUrl: events.imageUrl,
      description: events.description,
      createdBy: events.createdBy,
      externalSource: events.externalSource,
      sharerName: users.name,
      sharerUsername: users.username,
      sharerAvatarUrl: users.avatarUrl,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(where)
    .orderBy(asc(events.dateIso));

  const eventIds = eventRows.map((e) => e.id);

  // Run the rest in parallel
  const [
    hostsByEvent,
    rsvpCounts,
    cityRows,
    myRsvps,
    myHosting,
    allSavedRows,
  ] = await Promise.all([
    // Hosts per event with user info
    eventIds.length === 0
      ? Promise.resolve([] as { eventId: string; userId: string; role: string; name: string | null; username: string | null; avatarUrl: string | null; worldTitle: string | null; worldSlug: string | null }[])
      : db
          .select({
            eventId: eventHosts.eventId,
            userId: eventHosts.userId,
            role: eventHosts.role,
            name: users.name,
            username: users.username,
            avatarUrl: users.avatarUrl,
            worldTitle: worlds.title,
            worldSlug: worlds.slug,
          })
          .from(eventHosts)
          .leftJoin(users, eq(eventHosts.userId, users.id))
          .leftJoin(worlds, eq(eventHosts.worldId, worlds.id))
          .where(inArray(eventHosts.eventId, eventIds)),

    // RSVP counts per event
    eventIds.length === 0
      ? Promise.resolve([] as { eventId: string; value: number }[])
      : db
          .select({ eventId: eventRsvps.eventId, value: count() })
          .from(eventRsvps)
          .where(inArray(eventRsvps.eventId, eventIds))
          .groupBy(eventRsvps.eventId),

    // Distinct cities (always returned regardless of filter)
    db
      .selectDistinct({ city: events.city })
      .from(events)
      .where(eq(events.published, true)),

    // My RSVPs (event IDs)
    user
      ? db
          .select({ eventId: eventRsvps.eventId })
          .from(eventRsvps)
          .where(eq(eventRsvps.userId, user.id))
      : Promise.resolve([] as { eventId: string }[]),

    // My hosted event IDs (via eventHosts OR createdBy)
    user && eventIds.length > 0
      ? db
          .select({ eventId: eventHosts.eventId })
          .from(eventHosts)
          .where(and(eq(eventHosts.userId, user.id), inArray(eventHosts.eventId, eventIds)))
      : Promise.resolve([] as { eventId: string }[]),

    // All users' saved-events CSVs — used to compute an "interested" count
    // per event by slug. Cheap at current scale; revisit when it isn't.
    db
      .select({ savedEventSlugs: users.savedEventSlugs })
      .from(users),
  ]);

  // Build host map
  const hostMap: Record<string, typeof hostsByEvent> = {};
  for (const h of hostsByEvent) {
    if (!hostMap[h.eventId]) hostMap[h.eventId] = [];
    hostMap[h.eventId].push(h);
  }
  const rsvpCountMap: Record<string, number> = {};
  for (const r of rsvpCounts) rsvpCountMap[r.eventId] = r.value;

  // Interested-count map: slug → number of users who bookmarked it
  const interestedBySlug: Record<string, number> = {};
  for (const row of allSavedRows) {
    const csv = row.savedEventSlugs;
    if (!csv) continue;
    for (const raw of csv.split(',')) {
      const s = raw.trim();
      if (!s) continue;
      interestedBySlug[s] = (interestedBySlug[s] ?? 0) + 1;
    }
  }

  // Attach hosts + counts + my-RSVP + my-hosting + my-saved
  const myRsvpSet = new Set(myRsvps.map((r) => r.eventId));
  // Only mark events I'm hosting if (a) I have an eventHosts row OR
  // (b) I'm the createdBy AND the event isn't external (external events
  // are *shared*, not hosted — the real host lives on Partiful/Luma/etc.).
  const myHostingSet = new Set([
    ...myHosting.map((h) => h.eventId),
    ...(user
      ? eventRows.filter((e) => e.createdBy === user!.id && !e.externalSource).map((e) => e.id)
      : []),
  ]);
  const mySavedSlugs = new Set(
    (user?.savedEventSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );

  const enriched = eventRows.map((e) => ({
    ...e,
    hosts: hostMap[e.id] ?? [],
    rsvpCount: rsvpCountMap[e.id] ?? 0,
    interestedCount: interestedBySlug[e.slug] ?? 0,
    isGoing: myRsvpSet.has(e.id),
    isHosting: myHostingSet.has(e.id),
    isSaved: mySavedSlugs.has(e.slug),
  }));

  const cities = Array.from(new Set(cityRows.map((c) => c.city).filter((c): c is string => Boolean(c)))).sort();

  return {
    events: enriched,
    cities,
    mySavedSlugs: [...mySavedSlugs],
    currentUserId: user?.id ?? null,
  };
}

export type EventsOverview = Awaited<ReturnType<typeof getEventsOverview>>;
