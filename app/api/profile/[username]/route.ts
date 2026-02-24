import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tools } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }

    // Fetch core public fields using only guaranteed-to-exist columns
    const result = await db
      .select({
        name:            users.name,
        username:        users.username,
        bio:             users.bio,
        avatarUrl:       users.avatarUrl,
        socialWebsite:   users.socialWebsite,
        socialTwitter:   users.socialTwitter,
        socialInstagram: users.socialInstagram,
        createdAt:       users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    const user: Record<string, unknown> = { ...result[0], roleTags: null, toolSlugs: null };

    // Try to fetch new columns — silently skips if migration hasn't run yet
    try {
      const extended = await db
        .select({ roleTags: users.roleTags, toolSlugs: users.toolSlugs })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (extended[0]) {
        user.roleTags  = extended[0].roleTags;
        user.toolSlugs = extended[0].toolSlugs;
      }
    } catch {
      // Columns not migrated yet — return profile without tags/tools
    }

    // Resolve tool slugs → tool names/details for display
    let resolvedTools: { name: string; slug: string; category: string | null }[] = [];
    const toolSlugs = user.toolSlugs as string | null;
    if (toolSlugs) {
      const slugList = toolSlugs.split(',').map((s) => s.trim()).filter(Boolean);
      if (slugList.length > 0) {
        resolvedTools = await db
          .select({ name: tools.name, slug: tools.slug, category: tools.category })
          .from(tools)
          .where(inArray(tools.slug, slugList));
      }
    }

    return NextResponse.json({ user, tools: resolvedTools });
  } catch (error) {
    console.error('Public profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
