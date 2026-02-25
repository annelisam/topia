import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, notifications, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST – follow a user
export async function POST(request: NextRequest) {
  try {
    const { privyId, targetUserId } = await request.json();
    if (!privyId || !targetUserId) {
      return NextResponse.json({ error: 'Missing privyId or targetUserId' }, { status: 400 });
    }

    // Resolve follower from privyId
    const [follower] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!follower) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (follower.id === targetUserId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

    // Check if already following
    const existing = await db.select({ id: follows.id }).from(follows)
      .where(and(eq(follows.followerId, follower.id), eq(follows.followingId, targetUserId)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, alreadyFollowing: true });
    }

    // Create follow
    await db.insert(follows).values({ followerId: follower.id, followingId: targetUserId });

    // Create notification for the followed user
    await db.insert(notifications).values({
      recipientId: targetUserId,
      actorId: follower.id,
      type: 'follow',
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Follow POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE – unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, targetUserId } = await request.json();
    if (!privyId || !targetUserId) {
      return NextResponse.json({ error: 'Missing privyId or targetUserId' }, { status: 400 });
    }

    const [follower] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!follower) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await db.delete(follows)
      .where(and(eq(follows.followerId, follower.id), eq(follows.followingId, targetUserId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Follow DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
