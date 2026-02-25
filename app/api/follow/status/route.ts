import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET – check if current user follows target user
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const targetUserId = request.nextUrl.searchParams.get('targetUserId');

  if (!privyId || !targetUserId) {
    return NextResponse.json({ isFollowing: false });
  }

  try {
    const [follower] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!follower) return NextResponse.json({ isFollowing: false });

    const existing = await db.select({ id: follows.id }).from(follows)
      .where(and(eq(follows.followerId, follower.id), eq(follows.followingId, targetUserId)))
      .limit(1);

    return NextResponse.json({ isFollowing: existing.length > 0 });
  } catch (error) {
    console.error('Follow status error:', error);
    return NextResponse.json({ isFollowing: false });
  }
}
