import { NextResponse } from 'next/server';
import { db, worlds, creators } from '@/lib/db';
import { ilike, asc, eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const creatorSlug = searchParams.get('creator');
    const slug = searchParams.get('slug');

    const conditions = [eq(worlds.published, true)];

    if (slug) {
      conditions.push(eq(worlds.slug, slug));
    }

    if (category && category !== 'all') {
      conditions.push(ilike(worlds.category, category));
    }

    if (creatorSlug) {
      conditions.push(eq(creators.slug, creatorSlug));
    }

    const results = await db
      .select({
        id: worlds.id,
        title: worlds.title,
        slug: worlds.slug,
        description: worlds.description,
        category: worlds.category,
        imageUrl: worlds.imageUrl,
        websiteUrl: worlds.websiteUrl,
        country: worlds.country,
        tools: worlds.tools,
        collaborators: worlds.collaborators,
        dateAdded: worlds.dateAdded,
        creatorId: worlds.creatorId,
        creatorName: creators.name,
        creatorSlug: creators.slug,
        creatorWebsiteUrl: creators.websiteUrl,
        creatorCountry: creators.country,
      })
      .from(worlds)
      .leftJoin(creators, eq(worlds.creatorId, creators.id))
      .where(and(...conditions))
      .orderBy(asc(worlds.title));

    return NextResponse.json({
      worlds: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worlds' },
      { status: 500 }
    );
  }
}
