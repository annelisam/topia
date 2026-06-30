import { and, eq } from 'drizzle-orm';
import { db, users, events, eventHosts } from '@/lib/db';

type AuthSuccess = { user: { id: string; name: string | null } };
type AuthError = { error: string; status: 401 | 403 | 404 };

export async function requireManager(
  privyId: string | undefined,
  eventId: string,
): Promise<AuthSuccess | AuthError> {
  if (!privyId) return { error: 'Not authenticated', status: 401 };
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.privyId, privyId));
  if (!user) return { error: 'User not found', status: 404 };

  const [host] = await db
    .select({ id: eventHosts.id, role: eventHosts.role, manager: eventHosts.manager })
    .from(eventHosts)
    .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, user.id)));

  if (host) {
    if (!host.manager) return { error: 'Not authorized', status: 403 };
    return { user };
  }

  // Fallback: the event creator (non-external) is always a manager even
  // without an explicit eventHosts row.
  const [ev] = await db
    .select({ createdBy: events.createdBy, externalSource: events.externalSource })
    .from(events)
    .where(eq(events.id, eventId));
  if (ev && ev.createdBy === user.id && !ev.externalSource) return { user };

  return { error: 'Not authorized', status: 403 };
}
