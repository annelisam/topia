import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { TEAM } from '@/lib/team';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        roleTags: users.roleTags,
      })
      .from(users)
      .where(inArray(users.id, TEAM.map((m) => m.id)));

    const byId = new Map(rows.map((r) => [r.id, r]));

    // Return in TEAM order, with the title attached. A missing row means the
    // account was deleted — loud, because /about would silently lose a member.
    const team = TEAM.map((m) => {
      const row = byId.get(m.id);
      if (!row) {
        console.error(`[team] no users row for team member id ${m.id} (${m.title})`);
        return null;
      }
      return {
        username: row.username,
        name: row.name,
        avatarUrl: row.avatarUrl,
        roleTags: row.roleTags,
        title: m.title,
      };
    }).filter(Boolean);

    return NextResponse.json(
      { team },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err) {
    console.error('[team] failed to load team', err);
    return NextResponse.json({ team: [] }, { status: 500 });
  }
}
