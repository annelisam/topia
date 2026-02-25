import { NextResponse } from 'next/server';
import { db, tools } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike, or, asc, isNotNull } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query
    let query = db.select().from(tools);

    // Apply filters
    let conditions = [];

    if (category && category !== 'all') {
      // Case-insensitive search for category
      conditions.push(ilike(tools.category, `%${category}%`));
    }

    if (search) {
      conditions.push(
        or(
          ilike(tools.name, `%${search}%`),
          ilike(tools.description, `%${search}%`),
          ilike(tools.category, `%${search}%`)
        )
      );
    }

    // Execute query - ordered by name by default
    const results = await query
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(asc(tools.name));

    // Fetch users who have toolSlugs set, to build per-tool user lists
    const usersWithTools = await db
      .select({
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        toolSlugs: users.toolSlugs,
      })
      .from(users)
      .where(isNotNull(users.toolSlugs));

    // Build a map: toolSlug → [{username, name, avatarUrl}]
    const toolUserMap: Record<string, { username: string | null; name: string | null; avatarUrl: string | null }[]> = {};
    for (const u of usersWithTools) {
      if (!u.toolSlugs) continue;
      const slugs = u.toolSlugs.split(',').map(s => s.trim()).filter(Boolean);
      for (const slug of slugs) {
        if (!toolUserMap[slug]) toolUserMap[slug] = [];
        toolUserMap[slug].push({ username: u.username, name: u.name, avatarUrl: u.avatarUrl });
      }
    }

    // Attach users to each tool (max 5 returned, plus total count)
    const toolsWithUsers = results.map(tool => {
      const toolUsers = toolUserMap[tool.slug] || [];
      return {
        ...tool,
        users: toolUsers.slice(0, 5),
        userCount: toolUsers.length,
      };
    });

    return NextResponse.json({
      tools: toolsWithUsers,
      count: toolsWithUsers.length,
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
