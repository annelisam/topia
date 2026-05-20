import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tools, users } from '@/lib/db/schema';
import { desc, eq, isNotNull } from 'drizzle-orm';

/**
 * GET /api/tools/trending
 * Returns two short lists:
 *   - trending: most-used tools (by user toolSlugs count) + most-saved
 *   - newest: tools added in the last 30 days, newest first
 *
 * Both capped at 6.
 */
export async function GET() {
  try {
    // Trending: tally toolSlugs + savedToolSlugs across all users
    const allUsers = await db
      .select({
        toolSlugs: users.toolSlugs,
        savedToolSlugs: users.savedToolSlugs,
      })
      .from(users)
      .where(isNotNull(users.toolSlugs));

    const score: Record<string, number> = {};
    for (const u of allUsers) {
      const using = (u.toolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const saved = (u.savedToolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const s of using) score[s] = (score[s] ?? 0) + 2; // using counts double
      for (const s of saved) score[s] = (score[s] ?? 0) + 1;
    }
    const topSlugs = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

    let trending: { id: string; slug: string; name: string; url: string | null; category: string | null; score: number }[] = [];
    if (topSlugs.length > 0) {
      const { inArray } = await import('drizzle-orm');
      const rows = await db
        .select({ id: tools.id, slug: tools.slug, name: tools.name, url: tools.url, category: tools.category })
        .from(tools)
        .where(inArray(tools.slug, topSlugs));
      const map = new Map(rows.map((r) => [r.slug, r]));
      trending = topSlugs
        .map((s) => {
          const t = map.get(s);
          if (!t) return null;
          return { ...t, score: score[s] };
        })
        .filter((x): x is { id: string; slug: string; name: string; url: string | null; category: string | null; score: number } => x !== null);
    }

    // Newest tools (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newest = await db
      .select({ id: tools.id, slug: tools.slug, name: tools.name, url: tools.url, category: tools.category, createdAt: tools.createdAt })
      .from(tools)
      .where(eq(tools.published, true))
      .orderBy(desc(tools.createdAt))
      .limit(6);

    const recentNewest = newest.filter((t) => new Date(t.createdAt) > thirtyDaysAgo);

    return NextResponse.json({ trending, newest: recentNewest });
  } catch (error) {
    console.error('Trending tools error:', error);
    return NextResponse.json({ trending: [], newest: [] });
  }
}
