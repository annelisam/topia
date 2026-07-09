// Creating a connection between two users — the effect of scanning a Topia
// code. One call: mutual follows (the real social edge — unlocks Primary
// DMs via areMutual() and the orbit stamp), follow notifications for edges
// that are new, and an event_connections context row ("met at").
import { and, eq, inArray, or } from 'drizzle-orm';
import { db, follows, notifications, eventConnections, users } from '@/lib/db';

export async function createConnection(
  viewerId: string,
  targetId: string,
  eventId?: string | null,
): Promise<{ alreadyConnected: boolean }> {
  // Which follow edges already exist between the two?
  const existing = await db
    .select({ followerId: follows.followerId, followingId: follows.followingId })
    .from(follows)
    .where(
      or(
        and(eq(follows.followerId, viewerId), eq(follows.followingId, targetId)),
        and(eq(follows.followerId, targetId), eq(follows.followingId, viewerId)),
      ),
    );
  const hasEdge = (a: string, b: string) =>
    existing.some((f) => f.followerId === a && f.followingId === b);

  const newEdges: { followerId: string; followingId: string }[] = [];
  if (!hasEdge(viewerId, targetId)) newEdges.push({ followerId: viewerId, followingId: targetId });
  if (!hasEdge(targetId, viewerId)) newEdges.push({ followerId: targetId, followingId: viewerId });

  if (newEdges.length) {
    await db.insert(follows).values(newEdges);
    // Notify each newly-followed side, mirroring the follow-button behavior.
    await db.insert(notifications).values(
      newEdges.map((e) => ({ recipientId: e.followingId, actorId: e.followerId, type: 'follow' })),
    );
  }

  // Context row — pair stored sorted; unique index dedupes per event context.
  const [a, b] = viewerId < targetId ? [viewerId, targetId] : [targetId, viewerId];
  const inserted = await db
    .insert(eventConnections)
    .values({ userAId: a, userBId: b, eventId: eventId ?? null })
    .onConflictDoNothing()
    .returning({ id: eventConnections.id });

  return { alreadyConnected: newEdges.length === 0 && inserted.length === 0 };
}

/** The other person in each of the viewer's connections (optionally scoped
 * to one event), newest first. */
export async function listConnections(viewerId: string, eventId?: string | null) {
  const scope = eventId
    ? and(
        eq(eventConnections.eventId, eventId),
        or(eq(eventConnections.userAId, viewerId), eq(eventConnections.userBId, viewerId)),
      )
    : or(eq(eventConnections.userAId, viewerId), eq(eventConnections.userBId, viewerId));

  const rows = await db
    .select({
      userAId: eventConnections.userAId,
      userBId: eventConnections.userBId,
      eventId: eventConnections.eventId,
      createdAt: eventConnections.createdAt,
    })
    .from(eventConnections)
    .where(scope);

  const otherIds = Array.from(
    new Set(rows.map((r) => (r.userAId === viewerId ? r.userBId : r.userAId))),
  );
  if (otherIds.length === 0) return [];

  const people = await db
    .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, otherIds));
  const byId = new Map(people.map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const other = byId.get(r.userAId === viewerId ? r.userBId : r.userAId);
      return other ? { ...other, eventId: r.eventId, connectedAt: r.createdAt } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((x, y) => new Date(y.connectedAt).getTime() - new Date(x.connectedAt).getTime());
}
