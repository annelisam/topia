import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tools, users, worlds } from '@/lib/db/schema';
import { eq, ilike, isNotNull } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    // 1. The tool itself
    const [tool] = await db
      .select()
      .from(tools)
      .where(eq(tools.slug, slug))
      .limit(1);

    if (!tool) return NextResponse.json({ tool: null }, { status: 404 });

    // 2. Users who use this tool (toolSlugs CSV contains the slug)
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        toolSlugs: users.toolSlugs,
      })
      .from(users)
      .where(isNotNull(users.toolSlugs));

    const toolUsers = allUsers
      .filter((u) => {
        if (!u.toolSlugs) return false;
        return u.toolSlugs.split(',').map((s) => s.trim()).includes(slug);
      })
      .map(({ id, username, name, avatarUrl }) => ({ id, username, name, avatarUrl }));

    // 3. Related tools — co-occurrence in users' toolSlugs.
    // For every user who uses THIS tool, count the other tools they use;
    // the most common other tools are "related".
    const cooccurCount: Record<string, number> = {};
    for (const u of allUsers) {
      if (!u.toolSlugs) continue;
      const userSlugs = u.toolSlugs.split(',').map((s) => s.trim()).filter(Boolean);
      if (!userSlugs.includes(slug)) continue;
      for (const other of userSlugs) {
        if (other === slug) continue;
        cooccurCount[other] = (cooccurCount[other] ?? 0) + 1;
      }
    }
    const topRelatedSlugs = Object.entries(cooccurCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([s]) => s);

    let related: { slug: string; name: string; url: string | null; category: string | null; score: number }[] = [];
    if (topRelatedSlugs.length > 0) {
      // Single batch query for the metadata of related tools
      const { inArray } = await import('drizzle-orm');
      const rows = await db
        .select({ slug: tools.slug, name: tools.name, url: tools.url, category: tools.category })
        .from(tools)
        .where(inArray(tools.slug, topRelatedSlugs));
      const byslug = new Map(rows.map((r) => [r.slug, r]));
      related = topRelatedSlugs
        .map((s) => {
          const t = byslug.get(s);
          if (!t) return null;
          return { ...t, score: cooccurCount[s] };
        })
        .filter((x): x is { slug: string; name: string; url: string | null; category: string | null; score: number } => x !== null);
    }

    // 4. Worlds whose `tools` CSV mentions this tool (by slug or by name)
    const allWorlds = await db
      .select({
        id: worlds.id,
        title: worlds.title,
        slug: worlds.slug,
        category: worlds.category,
        imageUrl: worlds.imageUrl,
        tools: worlds.tools,
      })
      .from(worlds)
      .where(isNotNull(worlds.tools));

    const lcSlug = slug.toLowerCase();
    const lcName = tool.name.toLowerCase();
    const toolWorlds = allWorlds
      .filter((w) => {
        if (!w.tools) return false;
        const parts = w.tools.split(',').map((s) => s.trim().toLowerCase());
        return parts.includes(lcSlug) || parts.includes(lcName);
      })
      .map(({ id, title, slug, category, imageUrl }) => ({ id, title, slug, category, imageUrl }));

    return NextResponse.json({
      tool,
      users: toolUsers,
      worlds: toolWorlds,
      related,
    });
  } catch (error) {
    console.error('Tool detail fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
