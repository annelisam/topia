import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, creators, worldMembers, worldInvitations, users } from '@/lib/db/schema';
import { ilike, asc, eq, and, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const creatorSlug = searchParams.get('creator');
    const slug = searchParams.get('slug');
    // Manage mode: an owner/builder loading their own world's dashboard can see
    // it even when unpublished (archived). Everyone else sees published only.
    const manage = searchParams.get('manage') === '1';
    const privyId = searchParams.get('privyId');

    const conditions = [];
    if (slug) conditions.push(eq(worlds.slug, slug));
    if (category && category !== 'all') conditions.push(ilike(worlds.category, category));
    if (creatorSlug) conditions.push(eq(creators.slug, creatorSlug));

    let managerUserId: string | null = null;
    if (manage && privyId && slug) {
      const [caller] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
      managerUserId = caller?.id ?? null;
    }
    if (!managerUserId) conditions.push(eq(worlds.published, true));

    let results = await db
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
        createdAt: worlds.createdAt,
        published: worlds.published,
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

    // In manage mode only keep unpublished worlds the caller actually builds.
    if (managerUserId && results.some((w) => !w.published)) {
      const ids = results.map((w) => w.id);
      const mine = await db
        .select({ worldId: worldMembers.worldId })
        .from(worldMembers)
        .where(and(eq(worldMembers.userId, managerUserId), inArray(worldMembers.worldId, ids), inArray(worldMembers.role, ['owner', 'world_builder'])));
      const mineSet = new Set(mine.map((m) => m.worldId));
      results = results.filter((w) => w.published || mineSet.has(w.id));
    }

    // Fetch world members for all returned worlds
    const worldIds = results.map(w => w.id);
    let members: { worldId: string; userId: string; role: string; userName: string | null; userUsername: string | null; userAvatarUrl: string | null; createdAt: Date }[] = [];
    if (worldIds.length > 0) {
      // Only the returned worlds' members — not the whole table (indexed on world_id).
      members = await db
        .select({
          worldId: worldMembers.worldId,
          userId: worldMembers.userId,
          role: worldMembers.role,
          userName: users.name,
          userUsername: users.username,
          userAvatarUrl: users.avatarUrl,
          createdAt: worldMembers.createdAt,
        })
        .from(worldMembers)
        .innerJoin(users, eq(worldMembers.userId, users.id))
        .where(inArray(worldMembers.worldId, worldIds));
    }

    // Group members by worldId
    const memberMap: Record<string, typeof members> = {};
    for (const m of members) {
      if (!memberMap[m.worldId]) memberMap[m.worldId] = [];
      memberMap[m.worldId].push(m);
    }

    // Fetch pending invitations for all returned worlds
    let pendingInvites: { worldId: string; inviteeId: string; role: string; inviteeName: string | null; inviteeUsername: string | null; invitationId: string }[] = [];
    if (worldIds.length > 0) {
      // Only pending invites for the returned worlds (indexed on world_id).
      pendingInvites = await db
        .select({
          worldId: worldInvitations.worldId,
          inviteeId: worldInvitations.inviteeId,
          role: worldInvitations.role,
          inviteeName: users.name,
          inviteeUsername: users.username,
          invitationId: worldInvitations.id,
        })
        .from(worldInvitations)
        .innerJoin(users, eq(worldInvitations.inviteeId, users.id))
        .where(and(eq(worldInvitations.status, 'pending'), inArray(worldInvitations.worldId, worldIds)));
    }

    // Group pending invites by worldId
    const inviteMap: Record<string, typeof pendingInvites> = {};
    for (const i of pendingInvites) {
      if (!inviteMap[i.worldId]) inviteMap[i.worldId] = [];
      inviteMap[i.worldId].push(i);
    }

    const worldsWithMembers = results.map(w => ({
      ...w,
      members: memberMap[w.id] || [],
      pendingInvites: inviteMap[w.id] || [],
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
