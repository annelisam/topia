import { NextResponse } from 'next/server';
import { db, events } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const results = await db.select().from(events).orderBy(asc(events.eventName));
    return NextResponse.json({ events: results });
  } catch (error) {
    console.error('Admin GET events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(events).values({
      eventName: data.eventName,
      slug: data.slug,
      date: data.date || null,
      startTime: data.startTime || null,
      city: data.city || null,
      link: data.link || null,
      imageUrl: data.imageUrl || null,
      published: data.published ?? true,
    }).returning();

    return NextResponse.json({ event: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Admin POST event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const result = await db.update(events).set({
      eventName: data.eventName,
      slug: data.slug,
      date: data.date || null,
      startTime: data.startTime || null,
      city: data.city || null,
      link: data.link || null,
      imageUrl: data.imageUrl || null,
      published: data.published ?? true,
    }).where(eq(events.id, data.id)).returning();

    return NextResponse.json({ event: result[0] });
  } catch (error) {
    console.error('Admin PUT event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    if (!data.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(events).where(eq(events.id, data.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
