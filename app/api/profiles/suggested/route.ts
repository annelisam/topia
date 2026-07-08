import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows } from '@/lib/db/schema';
import { eq, and, isNotNull, ne, count } from 'drizzle-orm';

// GET /api/profiles/suggested?privyId=... — people the viewer might want to
// follow, ranked by role-tag overlap with the viewer's craft, then by follower
// count. Used by the onboarding follow step. Excludes the viewer and anyone
// they already follow.
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
    }

    const [viewer] = await db
      .select({ id: users.id, roleTags: users.roleTags })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!viewer) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const viewerTags = new Set(
      (viewer.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    );

    const [candidates, followerCounts, alreadyFollowing] = await Promise.all([
      // Complete public profiles only: handle + real name set, not hidden.
      db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          roleTags: users.roleTags,
        })
        .from(users)
        .where(and(eq(users.published, true), isNotNull(users.username), isNotNull(users.name), ne(users.id, viewer.id)))
        .limit(500),
      db
        .select({ followingId: follows.followingId, value: count() })
        .from(follows)
        .groupBy(follows.followingId),
      db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, viewer.id)),
    ]);

    const followed = new Set(alreadyFollowing.map((f) => f.followingId));
    const countByUser = new Map(followerCounts.map((f) => [f.followingId, f.value]));

    const suggestions = candidates
      .filter((u) => !followed.has(u.id))
      .map((u) => {
        const tags = (u.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        const overlap = tags.filter((t) => viewerTags.has(t));
        return {
          id: u.id,
          username: u.username,
          name: u.name,
          avatarUrl: u.avatarUrl,
          bio: u.bio,
          roleTags: tags,
          sharedTags: overlap,
          followers: countByUser.get(u.id) ?? 0,
        };
      })
      .sort((a, b) =>
        b.sharedTags.length - a.sharedTags.length || b.followers - a.followers)
      .slice(0, 8);

    return NextResponse.json(
      { suggestions },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[suggested] fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
