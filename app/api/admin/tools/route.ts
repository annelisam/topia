import { NextResponse } from 'next/server';
import { db, tools } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const results = await db.select().from(tools).orderBy(asc(tools.name));
    return NextResponse.json({ tools: results });
  } catch (error) {
    console.error('Admin GET tools:', error);
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(tools).values({
      name: data.name,
      slug: data.slug,
      category: data.category || null,
      description: data.description || null,
      pricing: data.pricing || null,
      url: data.url || null,
      featured: data.featured ?? false,
      priority: data.priority ? Number(data.priority) : null,
      easeOfUse: data.easeOfUse || null,
      published: data.published ?? true,
    }).returning();

    return NextResponse.json({ tool: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin POST tool:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = await db.update(tools).set({
      name: data.name,
      slug: data.slug,
      category: data.category || null,
      description: data.description || null,
      pricing: data.pricing || null,
      url: data.url || null,
      featured: data.featured ?? false,
      priority: data.priority ? Number(data.priority) : null,
      easeOfUse: data.easeOfUse || null,
      published: data.published ?? true,
    }).where(eq(tools.id, data.id)).returning();

    return NextResponse.json({ tool: result[0] });
  } catch (error) {
    console.error('Admin PUT tool:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(tools).where(eq(tools.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE tool:', error);
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
