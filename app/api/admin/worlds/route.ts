import { NextResponse } from 'next/server';
import { db, worlds, creators } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

// GET – all worlds (including unpublished)
export async function GET() {
  try {
    const results = await db
      .select({
        id: worlds.id,
        title: worlds.title,
        slug: worlds.slug,
        description: worlds.description,
        category: worlds.category,
        imageUrl: worlds.imageUrl,
        websiteUrl: worlds.websiteUrl,
        country: worlds.country,
        tools: worlds.tools,
        collaborators: worlds.collaborators,
        dateAdded: worlds.dateAdded,
        creatorId: worlds.creatorId,
        published: worlds.published,
        creatorName: creators.name,
      })
      .from(worlds)
      .leftJoin(creators, eq(worlds.creatorId, creators.id))
      .orderBy(asc(worlds.title));

    return NextResponse.json({ worlds: results });
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
      description: data.description || null,
      creatorId: data.creatorId || null,
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      websiteUrl: data.websiteUrl || null,
      country: data.country || null,
      tools: data.tools || null,
      collaborators: data.collaborators || null,
      dateAdded: data.dateAdded || null,
      published: data.published ?? true,
    }).returning();

    return NextResponse.json({ world: result[0] }, { status: 201 });
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

    const result = await db.update(worlds).set({
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      creatorId: data.creatorId || null,
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      websiteUrl: data.websiteUrl || null,
      country: data.country || null,
      tools: data.tools || null,
      collaborators: data.collaborators || null,
      dateAdded: data.dateAdded || null,
      published: data.published ?? true,
    }).where(eq(worlds.id, data.id)).returning();

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

    await db.delete(worlds).where(eq(worlds.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE world:', error);
    return NextResponse.json({ error: 'Failed to delete world' }, { status: 500 });
  }
}
