import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tools, worldMembers, worlds, follows } from '@/lib/db/schema';
import { eq, and, inArray, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    const result = await db
      .select({
        id:               users.id,
        name:             users.name,
        username:         users.username,
        bio:              users.bio,
        avatarUrl:        users.avatarUrl,
        socialWebsite:    users.socialWebsite,
        socialTwitter:    users.socialTwitter,
        socialInstagram:  users.socialInstagram,
        socialSoundcloud: users.socialSoundcloud,
        socialSpotify:    users.socialSpotify,
        socialLinkedin:   users.socialLinkedin,
        socialSubstack:   users.socialSubstack,
        roleTags:         users.roleTags,
        toolSlugs:        users.toolSlugs,
        createdAt:        users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    const user = result[0];

    // Run tool resolution, world memberships, and follow counts in parallel
    const toolSlugsPromise = (async () => {
      if (!user.toolSlugs) return [];
      const slugList = user.toolSlugs.split(',').map((s) => s.trim()).filter(Boolean);
      if (slugList.length === 0) return [];
      return db
        .select({ name: tools.name, slug: tools.slug, category: tools.category })
        .from(tools)
        .where(inArray(tools.slug, slugList));
    })();

    const worldMembershipsPromise = db
      .select({
        worldId: worldMembers.worldId,
        worldTitle: worlds.title,
        worldSlug: worlds.slug,
        worldCategory: worlds.category,
        worldImageUrl: worlds.imageUrl,
        role: worldMembers.role,
      })
      .from(worldMembers)
      .innerJoin(worlds, eq(worldMembers.worldId, worlds.id))
      .where(eq(worldMembers.userId, user.id));

    const followerCountPromise = db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    const followingCountPromise = db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    // If a viewer is logged in, check follow status
    const viewerFollowPromise = (async () => {
      if (!viewerPrivyId) return { isFollowing: false, isOwnProfile: false };
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (!viewer) return { isFollowing: false, isOwnProfile: false };
      if (viewer.id === user.id) return { isFollowing: false, isOwnProfile: true };
      const existing = await db.select({ id: follows.id }).from(follows)
        .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, user.id)))
        .limit(1);
      return { isFollowing: existing.length > 0, isOwnProfile: false };
    })();

    const [resolvedTools, worldMemberships, [followerResult], [followingResult], viewerStatus] = await Promise.all([
      toolSlugsPromise,
      worldMembershipsPromise,
      followerCountPromise,
      followingCountPromise,
      viewerFollowPromise,
    ]);

    return NextResponse.json({
      user,
      tools: resolvedTools,
      worldMemberships,
      followerCount: followerResult?.value ?? 0,
      followingCount: followingResult?.value ?? 0,
      isFollowing: viewerStatus.isFollowing,
      isOwnProfile: viewerStatus.isOwnProfile,
    });
  } catch (error) {
    console.error('Public profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
