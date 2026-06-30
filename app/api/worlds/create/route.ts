import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worlds, users, worldMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureShortLink } from '@/lib/shortlinkStore';

function createSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.privyId || !data.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id, path: users.path }).from(users).where(eq(users.privyId, data.privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.path === 'catalyst') return NextResponse.json({ error: 'Catalysts cannot create worlds' }, { status: 403 });

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

    // Add creator as owner
    await db.insert(worldMembers).values({
      worldId: world.id,
      userId: user.id,
      role: 'owner',
    });

    // Auto-generate the shareable short link (best-effort — never blocks create).
    try {
      await ensureShortLink({ path: `/worlds/${slug}`, kind: 'world', createdBy: user.id, preferredCode: slug });
    } catch { /* ignore */ }

    return NextResponse.json({ world }, { status: 201 });
  } catch (error) {
    console.error('Create world error:', error);
    return NextResponse.json({ error: 'Failed to create world' }, { status: 500 });
  }
}
