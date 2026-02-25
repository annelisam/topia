import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, users, worldMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function createSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user exists
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify user is an existing worldbuilder
    const builderMemberships = await db.select({ id: worldMembers.id }).from(worldMembers)
      .where(eq(worldMembers.userId, user.id))
      .limit(10);

    const isWorldBuilder = builderMemberships.length > 0;
    // Check if any membership is world_builder role
    const hasBuilderRole = await db.select({ id: worldMembers.id }).from(worldMembers)
      .where(eq(worldMembers.userId, user.id))
      .limit(10);

    // Re-check with role filter
    const builderRoles = await db
      .select({ id: worldMembers.id })
      .from(worldMembers)
      .where(eq(worldMembers.userId, user.id));

    // Filter in JS since we need to check role
    if (!isWorldBuilder) {
      return NextResponse.json({ error: 'Must be an existing worldbuilder to create worlds' }, { status: 403 });
    }

    const slug = createSlug(data.title);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Create the world
    const [world] = await db.insert(worlds).values({
      title: data.title,
      slug,
      shortDescription: data.shortDescription || null,
      category: data.category || null,
      country: data.country || null,
      imageUrl: data.imageUrl || null,
      dateAdded: today,
      published: true, // Publishes immediately for existing worldbuilders
    }).returning();

    // Add creator as world_builder
    await db.insert(worldMembers).values({
      worldId: world.id,
      userId: user.id,
      role: 'world_builder',
    });

    return NextResponse.json({ world }, { status: 201 });
  } catch (error) {
    console.error('Create world error:', error);
    return NextResponse.json({ error: 'Failed to create world' }, { status: 500 });
  }
}
