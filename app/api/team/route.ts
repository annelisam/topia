import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

const TEAM_USERNAMES = [
  'callmelatasha',
  'annelisa',
  'jada',
  'artbyjah',
  'd',
  'cxy',
];

export async function GET() {
  try {
    const rows = await db
      .select({
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        roleTags: users.roleTags,
      })
      .from(users)
      .where(inArray(users.username, TEAM_USERNAMES));

    return NextResponse.json({ team: rows });
  } catch {
    return NextResponse.json({ team: [] }, { status: 500 });
  }
}
