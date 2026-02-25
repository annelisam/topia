import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

// GET – get follower/following counts for a user
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ followers: 0, following: 0 });
  }

  try {
    const [followerResult] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingResult] = await db
      .select({ value: count() })
      .from(follows)
      .where(eq(follows.followerId, userId));

    return NextResponse.json({
      followers: followerResult?.value ?? 0,
      following: followingResult?.value ?? 0,
    });
  } catch (error) {
    console.error('Follow counts error:', error);
    return NextResponse.json({ followers: 0, following: 0 });
  }
}
