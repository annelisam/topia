import { db } from '@/lib/db';
import { users, worldMembers } from '@/lib/db/schema';
import { and, eq, isNotNull, ne, desc, inArray, notLike } from 'drizzle-orm';

/**
 * Public list of discoverable profiles (anyone who has claimed a username).
 * Powers the "Discover" carousel, /topians, and the server-rendered /home.
 * completeOnly requires a real uploaded photo + name + role tags (generated
 * fallback avatars are data:image/svg URIs, so those are excluded).
 * Each row includes isWorldBuilder — true when the user owns/builds any world.
 */
export async function getPublicProfiles({
  limit = 24,
  completeOnly = false,
}: {
  limit?: number;
  completeOnly?: boolean;
} = {}) {
  const conditions = [isNotNull(users.username), isNotNull(users.name), eq(users.published, true)];
  if (completeOnly) {
    conditions.push(
      isNotNull(users.avatarUrl), ne(users.avatarUrl, ''), notLike(users.avatarUrl, 'data:image/svg%'),
      isNotNull(users.roleTags), ne(users.roleTags, ''),
    );
  }

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatarUrl: users.avatarUrl,
      roleTags: users.roleTags,
      path: users.path,
      bio: users.bio,
      pronouns: users.pronouns,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(limit);

  // Mark actual world builders (owner / world_builder in any world).
  const ids = rows.map((r) => r.id);
  const builderRows = ids.length
    ? await db
        .selectDistinct({ userId: worldMembers.userId })
        .from(worldMembers)
        .where(and(inArray(worldMembers.userId, ids), inArray(worldMembers.role, ['owner', 'world_builder'])))
    : [];
  const builderSet = new Set(builderRows.map((b) => b.userId));

  return rows.map((r) => ({ ...r, isWorldBuilder: builderSet.has(r.id) }));
}
