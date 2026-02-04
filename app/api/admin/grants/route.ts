import { NextResponse } from 'next/server';
import { db, grants } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const results = await db.select().from(grants).orderBy(asc(grants.grantName));
    return NextResponse.json({ grants: results });
  } catch (error) {
    console.error('Admin GET grants:', error);
    return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(grants).values({
      grantName: data.grantName,
      slug: data.slug,
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
      status: data.status || null,
      notes: data.notes || null,
      source: data.source || null,
      published: data.published ?? true,
    }).returning();

    return NextResponse.json({ grant: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin POST grant:', error);
    return NextResponse.json({ error: 'Failed to create grant' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = await db.update(grants).set({
      grantName: data.grantName,
      slug: data.slug,
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
      status: data.status || null,
      notes: data.notes || null,
      source: data.source || null,
      published: data.published ?? true,
    }).where(eq(grants.id, data.id)).returning();

    return NextResponse.json({ grant: result[0] });
  } catch (error) {
    console.error('Admin PUT grant:', error);
    return NextResponse.json({ error: 'Failed to update grant' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(grants).where(eq(grants.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE grant:', error);
    return NextResponse.json({ error: 'Failed to delete grant' }, { status: 500 });
  }
}
