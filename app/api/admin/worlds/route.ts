import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, creators, worldMembers, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET – all worlds (including unpublished) with members
export async function GET() {
  try {
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
        displayOrder: worlds.displayOrder,
        creatorId: worlds.creatorId,
        published: worlds.published,
        creatorName: creators.name,
      })
      .from(worlds)
      .leftJoin(creators, eq(worlds.creatorId, creators.id))
      .orderBy(asc(worlds.displayOrder), asc(worlds.title));

    // Fetch all world members with user info
    const members = await db
      .select({
        worldId: worldMembers.worldId,
        userId: worldMembers.userId,
        role: worldMembers.role,
        userName: users.name,
        userUsername: users.username,
      })
      .from(worldMembers)
      .innerJoin(users, eq(worldMembers.userId, users.id));

    // Group members by worldId
    const memberMap: Record<string, { userId: string; role: string; userName: string | null; userUsername: string | null }[]> = {};
    for (const m of members) {
      if (!memberMap[m.worldId]) memberMap[m.worldId] = [];
      memberMap[m.worldId].push({
        userId: m.userId,
        role: m.role,
        userName: m.userName,
        userUsername: m.userUsername,
      });
    }

    const worldsWithMembers = results.map((w) => ({
      ...w,
      members: memberMap[w.id] || [],
    }));

    return NextResponse.json({ worlds: worldsWithMembers });
  } catch (error) {
    console.error('Admin GET worlds:', error);
    return NextResponse.json({ error: 'Failed to fetch worlds' }, { status: 500 });
  }
}

// POST – create world
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(worlds).values({
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      creatorId: data.creatorId || null,
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      headerImageUrl: data.headerImageUrl || null,
      country: data.country || null,
      tools: data.tools || null,
      collaborators: data.collaborators || null,
      socialLinks: data.socialLinks || null,
      dateAdded: data.dateAdded || null,
      displayOrder: data.displayOrder ?? 0,
      published: data.published ?? true,
    }).returning();

    const world = result[0];

    // Sync world members
    if (data.worldBuilderIds?.length || data.collaboratorIds?.length) {
      await syncWorldMembers(world.id, data.worldBuilderIds || [], data.collaboratorIds || []);
    }

    return NextResponse.json({ world }, { status: 201 });
  } catch (error) {
    console.error('Admin POST world:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to create world' }, { status: 500 });
  }
}

// PUT – update world
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Handle bulk reorder: { reorder: [{ id, displayOrder }] }
    if (data.reorder) {
      for (const item of data.reorder) {
        await db.update(worlds).set({ displayOrder: item.displayOrder }).where(eq(worlds.id, item.id));
      }
      return NextResponse.json({ ok: true });
    }

    const result = await db.update(worlds).set({
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      creatorId: data.creatorId || null,
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      headerImageUrl: data.headerImageUrl || null,
      country: data.country || null,
      tools: data.tools || null,
      collaborators: data.collaborators || null,
      socialLinks: data.socialLinks || null,
      dateAdded: data.dateAdded || null,
      displayOrder: data.displayOrder ?? 0,
      published: data.published ?? true,
    }).where(eq(worlds.id, data.id)).returning();

    // Sync world members
    await syncWorldMembers(data.id, data.worldBuilderIds || [], data.collaboratorIds || []);

    return NextResponse.json({ world: result[0] });
  } catch (error) {
    console.error('Admin PUT world:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update world' }, { status: 500 });
  }
}

// DELETE – delete world
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // World members cascade-delete via FK
    await db.delete(worlds).where(eq(worlds.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE world:', error);
    return NextResponse.json({ error: 'Failed to delete world' }, { status: 500 });
  }
}

// Helper: sync world members (replace all members for a world)
async function syncWorldMembers(worldId: string, worldBuilderIds: string[], collaboratorIds: string[]) {
  // Delete existing members for this world
  await db.delete(worldMembers).where(eq(worldMembers.worldId, worldId));

  // Insert world builders
  for (const userId of worldBuilderIds) {
    await db.insert(worldMembers).values({
      worldId,
      userId,
      role: 'world_builder',
    });
  }

  // Insert collaborators (skip if already a world builder)
  for (const userId of collaboratorIds) {
    if (!worldBuilderIds.includes(userId)) {
      await db.insert(worldMembers).values({
        worldId,
        userId,
        role: 'collaborator',
      });
    }
  }
}
