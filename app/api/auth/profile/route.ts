import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worldMembers, worlds } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');

    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ user: null, worldMemberships: [] });
    }

    const user = result[0];

    // Fetch world memberships for this user
    const memberships = await db
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

    return NextResponse.json({ user, worldMemberships: memberships });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
