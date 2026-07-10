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

    // Slug: auto-dedupe on collision (suffix -2, -3, …) — two worlds with the
    // same title must never turn into a unique-constraint 500.
    const base = createSlug(data.title) || 'world';
    let slug = base;
    for (let n = 2; ; n++) {
      const [existing] = await db.select({ id: worlds.id }).from(worlds).where(eq(worlds.slug, slug)).limit(1);
      if (!existing) break;
      slug = `${base}-${n}`;
    }
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Create the world. published defaults to true; the wizard can pass
    // published:false to keep it a draft until the creator is ready.
    const [world] = await db.insert(worlds).values({
      title: data.title,
      slug,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      category: data.category || null,
      country: data.country || null,
      imageUrl: data.imageUrl || null,
      dateAdded: today,
      published: data.published === false ? false : true,
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
