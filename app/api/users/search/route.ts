import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, ilike, and, ne, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const privyId = request.nextUrl.searchParams.get('privyId');

  if (!privyId || !q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    // Resolve caller
    const [caller] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!caller) return NextResponse.json({ users: [] });

    // Search by username or name, exclude self
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(and(
        or(ilike(users.username, `%${q}%`), ilike(users.name, `%${q}%`)),
        ne(users.id, caller.id),
      ))
      .limit(10);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ users: [] });
  }
}
