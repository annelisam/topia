import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, creators, worldMembers, users } from '@/lib/db/schema';
import { ilike, asc, eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const creatorSlug = searchParams.get('creator');
    const slug = searchParams.get('slug');

    const conditions = [eq(worlds.published, true)];

    if (slug) {
      conditions.push(eq(worlds.slug, slug));
    }

    if (category && category !== 'all') {
      conditions.push(ilike(worlds.category, category));
    }

    if (creatorSlug) {
      conditions.push(eq(creators.slug, creatorSlug));
    }

    const results = await db
      .select({
        id: worlds.id,
        title: worlds.title,
        slug: worlds.slug,
        shortDescription: worlds.shortDescription,
        description: worlds.description,
        category: worlds.category,
        imageUrl: worlds.imageUrl,
        headerImageUrl: worlds.headerImageUrl,
        country: worlds.country,
        tools: worlds.tools,
        collaborators: worlds.collaborators,
        socialLinks: worlds.socialLinks,
        dateAdded: worlds.dateAdded,
        creatorId: worlds.creatorId,
        creatorName: creators.name,
        creatorSlug: creators.slug,
        creatorWebsiteUrl: creators.websiteUrl,
        creatorCountry: creators.country,
      })
      .from(worlds)
      .leftJoin(creators, eq(worlds.creatorId, creators.id))
      .where(and(...conditions))
      .orderBy(asc(worlds.displayOrder), asc(worlds.title));

    // Fetch world members for all returned worlds
    const worldIds = results.map(w => w.id);
    let members: { worldId: string; userId: string; role: string; userName: string | null; userUsername: string | null; userAvatarUrl: string | null }[] = [];
    if (worldIds.length > 0) {
      const memberResults = await db
        .select({
          worldId: worldMembers.worldId,
          userId: worldMembers.userId,
          role: worldMembers.role,
          userName: users.name,
          userUsername: users.username,
          userAvatarUrl: users.avatarUrl,
        })
        .from(worldMembers)
        .innerJoin(users, eq(worldMembers.userId, users.id));

      members = memberResults.filter(m => worldIds.includes(m.worldId));
    }

    // Group members by worldId
    const memberMap: Record<string, typeof members> = {};
    for (const m of members) {
      if (!memberMap[m.worldId]) memberMap[m.worldId] = [];
      memberMap[m.worldId].push(m);
    }

    const worldsWithMembers = results.map(w => ({
      ...w,
      members: memberMap[w.id] || [],
    }));

    return NextResponse.json({
      worlds: worldsWithMembers,
      count: worldsWithMembers.length,
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worlds' },
      { status: 500 }
    );
  }
}
