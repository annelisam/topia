import { NextResponse } from 'next/server';
import { db, creators } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

// GET – all creators (including unpublished)
export async function GET() {
  try {
    const results = await db.select().from(creators).orderBy(asc(creators.name));
    return NextResponse.json({ creators: results });
  } catch (error) {
    console.error('Admin GET creators:', error);
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
  }
}

// POST – create creator
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(creators).values({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      websiteUrl: data.websiteUrl || null,
      country: data.country || null,
      published: data.published ?? true,
    }).returning();

    return NextResponse.json({ creator: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin POST creator:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to create creator' }, { status: 500 });
  }
}

// PUT – update creator
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = await db.update(creators).set({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      websiteUrl: data.websiteUrl || null,
      country: data.country || null,
      published: data.published ?? true,
    }).where(eq(creators.id, data.id)).returning();

    return NextResponse.json({ creator: result[0] });
  } catch (error) {
    console.error('Admin PUT creator:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to update creator' }, { status: 500 });
  }
}

// DELETE – delete creator
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(creators).where(eq(creators.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE creator:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to delete creator' }, { status: 500 });
  }
}
