import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tools, worldMembers, worlds } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

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

    // Resolve tool slugs → tool names/details for display
    let resolvedTools: { name: string; slug: string; category: string | null }[] = [];
    if (user.toolSlugs) {
      const slugList = user.toolSlugs.split(',').map((s) => s.trim()).filter(Boolean);
      if (slugList.length > 0) {
        resolvedTools = await db
          .select({ name: tools.name, slug: tools.slug, category: tools.category })
          .from(tools)
          .where(inArray(tools.slug, slugList));
      }
    }

    // Fetch world memberships for this user
    let worldMemberships: { worldId: string; worldTitle: string; worldSlug: string; worldCategory: string | null; worldImageUrl: string | null; role: string }[] = [];
    worldMemberships = await db
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

    return NextResponse.json({ user, tools: resolvedTools, worldMemberships });
  } catch (error) {
    console.error('Public profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
