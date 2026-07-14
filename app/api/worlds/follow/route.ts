import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldFollows, worldMembers, worlds, users, notifications } from '@/lib/db/schema';
import { eq, and, count, desc, inArray } from 'drizzle-orm';

// GET /api/worlds/follow?worldId=...&privyId=... — watcher count for a world,
// plus whether the viewer watches it (privyId optional). With &list=1, also
// returns who's watching (public profile bits only).
export async function GET(request: NextRequest) {
  try {
    const worldId = request.nextUrl.searchParams.get('worldId');
    const privyId = request.nextUrl.searchParams.get('privyId');
    const wantList = request.nextUrl.searchParams.get('list') === '1';
    if (!worldId) return NextResponse.json({ error: 'Missing worldId' }, { status: 400 });

    if (wantList) {
      const watchers = await db
        .select({
          userId: worldFollows.userId,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
        })
        .from(worldFollows)
        .innerJoin(users, eq(users.id, worldFollows.userId))
        .where(eq(worldFollows.worldId, worldId))
        .orderBy(desc(worldFollows.createdAt))
        .limit(200);
      return NextResponse.json(
        { watchers },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const [{ value: followers }] = await db
      .select({ value: count() })
      .from(worldFollows)
      .where(eq(worldFollows.worldId, worldId));

    let following = false;
    if (privyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
      if (viewer) {
        const [row] = await db
          .select({ id: worldFollows.id })
          .from(worldFollows)
          .where(and(eq(worldFollows.worldId, worldId), eq(worldFollows.userId, viewer.id)))
          .limit(1);
        following = Boolean(row);
      }
    }

    return NextResponse.json(
      { followers, following },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[world-follow] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/worlds/follow — follow a world
export async function POST(request: NextRequest) {
  try {
    const { privyId, worldId } = await request.json();
    if (!privyId || !worldId) {
      return NextResponse.json({ error: 'Missing privyId or worldId' }, { status: 400 });
    }

    const [follower] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!follower) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const [world] = await db
      .select({ id: worlds.id, title: worlds.title, slug: worlds.slug })
      .from(worlds)
      .where(eq(worlds.id, worldId))
      .limit(1);
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const [existing] = await db
      .select({ id: worldFollows.id })
      .from(worldFollows)
      .where(and(eq(worldFollows.worldId, worldId), eq(worldFollows.userId, follower.id)))
      .limit(1);
    if (existing) return NextResponse.json({ ok: true, alreadyFollowing: true });

    try {
      await db.insert(worldFollows).values({ worldId, userId: follower.id });
    } catch {
      // Unique race — someone double-clicked; the follow exists, which is fine.
      return NextResponse.json({ ok: true, alreadyFollowing: true });
    }

    // Tell the builders someone new is following their world.
    try {
      const builders = await db
        .select({ userId: worldMembers.userId })
        .from(worldMembers)
        .where(and(eq(worldMembers.worldId, worldId), inArray(worldMembers.role, ['owner', 'world_builder'])));
      for (const b of builders) {
        if (b.userId === follower.id) continue;
        await db.insert(notifications).values({
          recipientId: b.userId,
          actorId: follower.id,
          type: 'world_follow',
          metadata: { worldId: world.id, worldTitle: world.title, worldSlug: world.slug },
        });
      }
    } catch (e) {
      console.error('[world-follow] builder notification failed:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[world-follow] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/worlds/follow — unfollow a world
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, worldId } = await request.json();
    if (!privyId || !worldId) {
      return NextResponse.json({ error: 'Missing privyId or worldId' }, { status: 400 });
    }

    const [follower] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!follower) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    await db
      .delete(worldFollows)
      .where(and(eq(worldFollows.worldId, worldId), eq(worldFollows.userId, follower.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[world-follow] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
