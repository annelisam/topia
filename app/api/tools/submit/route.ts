import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tools, users, worldMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function createSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user exists and is associated with a world
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const memberships = await db.select({ id: worldMembers.id }).from(worldMembers).where(eq(worldMembers.userId, user.id)).limit(1);
    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Must be associated with a world to submit tools' }, { status: 403 });
    }

    const slug = createSlug(data.name);
    const result = await db.insert(tools).values({
      name: data.name,
      slug,
      category: data.category || null,
      description: data.description || null,
      pricing: data.pricing || null,
      url: data.url || null,
      published: false, // Requires admin approval
    }).returning();

    return NextResponse.json({ tool: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Submit tool error:', error);
    return NextResponse.json({ error: 'Failed to submit tool' }, { status: 500 });
  }
}
