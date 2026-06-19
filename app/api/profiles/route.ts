import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, isNotNull, desc } from 'drizzle-orm';

// GET /api/profiles — public list of discoverable profiles (anyone who has
// claimed a username). Powers the "Discover" grid on the homepage.
//   ?limit=24  (max 48)
export async function GET(request: NextRequest) {
  const limit = Math.min(48, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 24));
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        roleTags: users.roleTags,
        path: users.path,
        bio: users.bio,
        pronouns: users.pronouns,
      })
      .from(users)
      .where(and(isNotNull(users.username), isNotNull(users.name)))
      .orderBy(desc(users.createdAt))
      .limit(limit);

    return NextResponse.json({ profiles: rows });
  } catch (error) {
    console.error('GET profiles error:', error);
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
  }
}
