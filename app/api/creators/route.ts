import { NextResponse } from 'next/server';
import { db, creators, worlds } from '@/lib/db';
import { eq, asc, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Single creator detail
      const creator = await db
        .select()
        .from(creators)
        .where(eq(creators.slug, slug))
        .limit(1);

      if (!creator[0]) {
        return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
      }

      // Get worlds by this creator
      const creatorWorlds = await db
        .select({
          id: worlds.id,
          title: worlds.title,
          slug: worlds.slug,
          description: worlds.description,
          category: worlds.category,
          imageUrl: worlds.imageUrl,
          country: worlds.country,
          dateAdded: worlds.dateAdded,
        })
        .from(worlds)
        .where(eq(worlds.creatorId, creator[0].id))
        .orderBy(asc(worlds.title));

      return NextResponse.json({
        creator: creator[0],
        worlds: creatorWorlds,
      });
    }

    // All creators
    const results = await db
      .select()
      .from(creators)
      .where(eq(creators.published, true))
      .orderBy(asc(creators.name));

    return NextResponse.json({
      creators: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}
