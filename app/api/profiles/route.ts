import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worldMembers } from '@/lib/db/schema';
import { and, eq, isNotNull, ne, desc, inArray, notLike } from 'drizzle-orm';

// Public, viewer-independent list → let the CDN serve repeat hits. Short fresh
// window + a longer stale-while-revalidate keeps it snappy without going stale.
const LIST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

// GET /api/profiles — public list of discoverable profiles (anyone who has
// claimed a username). Powers the "Discover" carousel and /topians.
//   ?limit=24        (max 48; max 500 with all=1)
//   ?complete=1      only fully-filled profiles (photo + name + tags), where
//                    "photo" means a real upload — generated avatars excluded
//   ?all=1           the full directory for /topians (raises the limit cap)
// Each row includes isWorldBuilder — true when the user owns/builds any world
// (derived from memberships, not the self-selected path).
export async function GET(request: NextRequest) {
  const allMode = request.nextUrl.searchParams.get('all') === '1';
  const maxLimit = allMode ? 500 : 48;
  const limit = Math.min(maxLimit, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 24));
  const completeOnly = request.nextUrl.searchParams.get('complete') === '1';
  try {
    const conditions = [isNotNull(users.username), isNotNull(users.name), eq(users.published, true)];
    if (completeOnly) {
      // A "completed" profile has a real uploaded photo, a name, and at least
      // one role tag (bio is optional — not everyone writes one). Generated
      // fallback avatars are data:image/svg URIs, so exclude those.
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

    const profiles = rows.map((r) => ({ ...r, isWorldBuilder: builderSet.has(r.id) }));
    return NextResponse.json({ profiles }, { headers: { 'Cache-Control': LIST_CACHE } });
  } catch (error) {
    console.error('GET profiles error:', error);
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
  }
}
