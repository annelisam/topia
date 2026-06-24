import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventRsvps, follows } from '@/lib/db';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { isRealPhoto, fallbackAvatarDataUrl } from '@/lib/avatar';

// GET /api/events/guests?eventId=X&viewerPrivyId=Y — public "Who's Going" list.
// Only guests who have completed their profile (claimed a handle) are returned,
// and only public fields: id, photo, handle, tags (no names / no contact info).
// Photoless handle-holders get a deterministic automated avatar. When a viewer
// is supplied, each guest also carries whether the viewer already follows them
// and whether the guest IS the viewer (so the Follow button can hide itself).
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');
    const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const rows = await db
      .select({
        userId: users.id,
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

    // Resolve the viewer + which of these guests they already follow.
    let viewerId: string | null = null;
    const followingIds = new Set<string>();
    if (viewerPrivyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (viewer) {
        viewerId = viewer.id;
        const ids = rows.map((r) => r.userId);
        if (ids.length > 0) {
          const rels = await db
            .select({ followingId: follows.followingId })
            .from(follows)
            .where(and(eq(follows.followerId, viewer.id), inArray(follows.followingId, ids)));
          for (const rel of rels) followingIds.add(rel.followingId);
        }
      }
    }

    const guests = rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      avatarUrl: isRealPhoto(r.avatarUrl)
        ? r.avatarUrl
        : fallbackAvatarDataUrl(r.name, r.privyId || r.username || ''),
      roleTags: r.roleTags ? r.roleTags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      isFollowing: followingIds.has(r.userId),
      isSelf: viewerId === r.userId,
    }));

    return NextResponse.json({ guests, count: guests.length });
  } catch (error) {
    console.error('GET event guests:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}
