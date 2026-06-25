import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// GET – list a user's followers or following.
//   ?userId=<uuid>&type=followers|following
// Returns lightweight user cards: { id, username, name, avatarUrl, path }.
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const type = request.nextUrl.searchParams.get('type') === 'following' ? 'following' : 'followers';

  if (!userId) {
    return NextResponse.json({ users: [] });
  }

  try {
    const u = alias(users, 'u');
    // followers: people who follow `userId`  → join on follows.followerId
    // following: people `userId` follows      → join on follows.followingId
    const rows = await db
      .select({
        id: u.id,
        username: u.username,
        name: u.name,
        avatarUrl: u.avatarUrl,
        path: u.path,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(
        u,
        eq(u.id, type === 'followers' ? follows.followerId : follows.followingId),
      )
      .where(eq(type === 'followers' ? follows.followingId : follows.followerId, userId))
      .orderBy(desc(follows.createdAt));

    const list = rows
      .filter((r) => r.username) // only profiles with a public handle
      .map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        avatarUrl: r.avatarUrl,
        path: r.path,
      }));

    return NextResponse.json({ users: list });
  } catch (error) {
    console.error('Follow list error:', error);
    return NextResponse.json({ users: [] });
  }
}
