import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps } from '@/lib/db';
import { eq, and, isNotNull } from 'drizzle-orm';
import { isRealPhoto, fallbackAvatarDataUrl } from '@/lib/avatar';

// GET /api/events/guests?eventId=X — public "Who's Going" list.
// Only guests who have completed their profile (claimed a handle) are returned,
// and only public fields: photo, handle, tags (no names / no contact info).
// Photoless handle-holders get a deterministic automated avatar.
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const rows = await db
      .select({
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        roleTags: users.roleTags,
        privyId: users.privyId,
      })
      .from(eventRsvps)
      .innerJoin(users, eq(eventRsvps.userId, users.id))
      .where(and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, 'going'),
        isNotNull(users.username),
      ))
      .orderBy(eventRsvps.createdAt);

    const guests = rows.map((r) => ({
      username: r.username,
      avatarUrl: isRealPhoto(r.avatarUrl)
        ? r.avatarUrl
        : fallbackAvatarDataUrl(r.name, r.privyId || r.username || ''),
      roleTags: r.roleTags ? r.roleTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    }));

    return NextResponse.json({ guests, count: guests.length });
  } catch (error) {
    console.error('GET event guests:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}
