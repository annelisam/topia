import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldEras, eraMilestones, lifeChapters } from '@/lib/db/schema';
import { eq, and, asc, inArray, sql } from 'drizzle-orm';

// GET /api/profile/in-process?username=X — the passport's Life // In Process
// tab: the person's life chapters interleaved with the eras of worlds they
// build in (mockup 2b). Public read, like the rest of the passport.
export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get('username');
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const [person] = await db.select({ id: users.id }).from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`).limit(1);
    if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [chapters, memberships] = await Promise.all([
      db.select().from(lifeChapters)
        .where(eq(lifeChapters.userId, person.id))
        .orderBy(asc(lifeChapters.sortOrder), asc(lifeChapters.createdAt)),
      db.select({ worldId: worldMembers.worldId, role: worldMembers.role }).from(worldMembers)
        .where(and(eq(worldMembers.userId, person.id), inArray(worldMembers.role, ['owner', 'world_builder']))),
    ]);

    let worldEntries: unknown[] = [];
    if (memberships.length > 0) {
      const eras = await db
        .select({
          id: worldEras.id,
          title: worldEras.title,
          description: worldEras.description,
          startDate: worldEras.startDate,
          endDate: worldEras.endDate,
          startPrecision: worldEras.startPrecision,
          endPrecision: worldEras.endPrecision,
          startLabel: worldEras.startLabel,
          endLabel: worldEras.endLabel,
          status: worldEras.status,
          worldId: worldEras.worldId,
          worldTitle: worlds.title,
          worldSlug: worlds.slug,
          worldPublished: worlds.published,
        })
        .from(worldEras)
        .innerJoin(worlds, eq(worlds.id, worldEras.worldId))
        .where(inArray(worldEras.worldId, memberships.map((m) => m.worldId)))
        .orderBy(asc(worldEras.createdAt));

      const visible = eras.filter((e) => e.worldPublished && e.status !== 'archived');
      const counts = visible.length
        ? await db
            .select({ eraId: eraMilestones.eraId, status: eraMilestones.status })
            .from(eraMilestones)
            .where(inArray(eraMilestones.eraId, visible.map((e) => e.id)))
        : [];
      worldEntries = visible.map((e) => {
        const mine = counts.filter((c) => c.eraId === e.id);
        return {
          eraId: e.id,
          title: e.title,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
          startPrecision: e.startPrecision,
          endPrecision: e.endPrecision,
          startLabel: e.startLabel,
          endLabel: e.endLabel,
          status: e.status,
          worldTitle: e.worldTitle,
          worldSlug: e.worldSlug,
          milestoneCount: mine.length,
          nowCount: mine.filter((c) => c.status === 'now').length,
          doneCount: mine.filter((c) => c.status === 'done').length,
        };
      });
    }

    // No CDN caching — a stale cached response made just-added chapters
    // vanish from the owner's editor for 60s in production.
    return NextResponse.json(
      { chapters, worldEras: worldEntries },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[in-process] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
