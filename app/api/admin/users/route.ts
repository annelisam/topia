import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worldMembers, worlds } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET – all users with their world memberships
export async function GET() {
  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(asc(users.name));

    // Fetch world memberships for all users
    const memberships = await db
      .select({
        userId: worldMembers.userId,
        worldId: worldMembers.worldId,
        role: worldMembers.role,
        worldTitle: worlds.title,
        worldSlug: worlds.slug,
      })
      .from(worldMembers)
      .innerJoin(worlds, eq(worldMembers.worldId, worlds.id));

    // Group memberships by userId
    const membershipMap: Record<string, { worldId: string; role: string; worldTitle: string; worldSlug: string }[]> = {};
    for (const m of memberships) {
      if (!membershipMap[m.userId]) membershipMap[m.userId] = [];
      membershipMap[m.userId].push({
        worldId: m.worldId,
        role: m.role,
        worldTitle: m.worldTitle,
        worldSlug: m.worldSlug,
      });
    }

    const result = allUsers.map((u) => ({
      ...u,
      worldMemberships: membershipMap[u.id] || [],
    }));

    return NextResponse.json({ users: result });
  } catch (error) {
    console.error('Admin GET users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PUT – update user profile
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = await db.update(users).set({
      name: data.name || null,
      username: data.username || null,
      bio: data.bio || null,
      avatarUrl: data.avatarUrl || null,
      role: data.role || 'user',
      roleTags: data.roleTags || null,
      toolSlugs: data.toolSlugs || null,
      socialWebsite: data.socialWebsite || null,
      socialTwitter: data.socialTwitter || null,
      socialInstagram: data.socialInstagram || null,
      socialSoundcloud: data.socialSoundcloud || null,
      socialSpotify: data.socialSpotify || null,
      socialLinkedin: data.socialLinkedin || null,
      socialSubstack: data.socialSubstack || null,
      updatedAt: new Date(),
    }).where(eq(users.id, data.id)).returning();

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Admin PUT user:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE – delete user
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // worldMembers cascade-delete via FK, but clear creator links manually
    const { creators } = await import('@/lib/db/schema');
    await db.update(creators).set({ userId: null }).where(eq(creators.userId, data.id));

    await db.delete(users).where(eq(users.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
