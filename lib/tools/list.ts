import { db, tools } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike, or, and, asc, desc, eq, isNotNull } from 'drizzle-orm';

/**
 * Published tools with per-tool user lists (who has it in their kit).
 * Shared by /api/tools and the server-rendered /resources/tools page.
 */
export async function getToolsList({
  category,
  search,
  sort,
}: {
  category?: string | null;
  search?: string | null;
  sort?: string | null;
} = {}) {
  const conditions = [eq(tools.published, true)];

  if (category && category !== 'all') {
    conditions.push(ilike(tools.category, `%${category}%`));
  }

  if (search) {
    conditions.push(
      or(
        ilike(tools.name, `%${search}%`),
        ilike(tools.description, `%${search}%`),
        ilike(tools.category, `%${search}%`)
      )!
    );
  }

  let orderBy;
  switch (sort) {
    case 'name_desc': orderBy = desc(tools.name); break;
    case 'newest': orderBy = desc(tools.createdAt); break;
    default: orderBy = asc(tools.name); break;
  }

  const results = await db
    .select()
    .from(tools)
    .where(and(...conditions))
    .orderBy(orderBy);

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
  return results.map(tool => {
    const toolUsers = toolUserMap[tool.slug] || [];
    return {
      ...tool,
      users: toolUsers.slice(0, 5),
      userCount: toolUsers.length,
    };
  });
}
