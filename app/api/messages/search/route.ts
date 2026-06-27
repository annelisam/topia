import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows } from '@/lib/db/schema';
import { and, eq, ne, or, ilike, inArray, isNotNull } from 'drizzle-orm';
import { userIdFromPrivy } from '@/lib/messages';

// GET /api/messages/search?privyId=…&q=… — find people to start a chat with.
// Returns up to 10 matches by handle/name, each flagged `mutual` so the UI can
// warn that a non-mutual message will arrive as a request.
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  const me = await userIdFromPrivy(privyId);
  if (!me || q.length < 2) return NextResponse.json({ users: [] });

  try {
    const like = `%${q}%`;
    const cands = await db
      .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(and(ne(users.id, me), isNotNull(users.username), or(ilike(users.username, like), ilike(users.name, like))))
      .limit(10);

    const ids = cands.map((c) => c.id);
    let mutual = new Set<string>();
    if (ids.length) {
      const [iFollow, followsMe] = await Promise.all([
        db.select({ id: follows.followingId }).from(follows).where(and(eq(follows.followerId, me), inArray(follows.followingId, ids))),
        db.select({ id: follows.followerId }).from(follows).where(and(eq(follows.followingId, me), inArray(follows.followerId, ids))),
      ]);
      const a = new Set(iFollow.map((r) => r.id));
      const b = new Set(followsMe.map((r) => r.id));
      mutual = new Set(ids.filter((id) => a.has(id) && b.has(id)));
    }

    return NextResponse.json({ users: cands.map((c) => ({ ...c, mutual: mutual.has(c.id) })) });
  } catch (error) {
    console.error('Message search error:', error);
    return NextResponse.json({ users: [] });
  }
}
