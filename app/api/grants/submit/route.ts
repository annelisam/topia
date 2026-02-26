import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { grants, users, worldMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function createSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.grantName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user exists and is associated with a world
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, data.privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const memberships = await db.select({ id: worldMembers.id }).from(worldMembers).where(eq(worldMembers.userId, user.id)).limit(1);
    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Must be associated with a world to submit grants' }, { status: 403 });
    }

    const slug = createSlug(data.grantName);
    const result = await db.insert(grants).values({
      grantName: data.grantName,
      slug,
      shortDescription: data.shortDescription || null,
      amountMin: data.amountMin ? Number(data.amountMin) : null,
      amountMax: data.amountMax ? Number(data.amountMax) : null,
      currency: data.currency || 'USD',
      tags: data.tags || null,
      eligibility: data.eligibility || null,
      deadlineType: data.deadlineType || null,
      deadlineDate: data.deadlineDate || null,
      link: data.link || null,
      region: data.region || null,
      category: data.category || null,
      frequency: data.frequency || null,
      orgName: data.orgName || null,
      source: data.source || null,
      notes: data.notes || null,
      status: 'Open',
      published: false, // Requires admin approval
    }).returning();

    return NextResponse.json({ grant: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Submit grant error:', error);
    return NextResponse.json({ error: 'Failed to submit grant' }, { status: 500 });
  }
}
