import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tvEpisodes } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

/**
 * GET /api/tv/episodes
 *
 * Returns all published Topia TV episodes ordered by:
 *   series → episode number → part number → createdAt
 *
 * The /tv page hits this once on load; episodes are static-ish so this is
 * cheap. If we grow into hundreds of episodes we can add a series filter
 * via ?series=… without changing the response shape.
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: tvEpisodes.id,
        slug: tvEpisodes.slug,
        title: tvEpisodes.title,
        description: tvEpisodes.description,
        category: tvEpisodes.category,
        seriesSlug: tvEpisodes.seriesSlug,
        seriesTitle: tvEpisodes.seriesTitle,
        episodeNumber: tvEpisodes.episodeNumber,
        partNumber: tvEpisodes.partNumber,
        videoUrl: tvEpisodes.videoUrl,
        thumbnailUrl: tvEpisodes.thumbnailUrl,
        durationSeconds: tvEpisodes.durationSeconds,
        guestName: tvEpisodes.guestName,
        publishedAt: tvEpisodes.publishedAt,
      })
      .from(tvEpisodes)
      .where(eq(tvEpisodes.published, true))
      .orderBy(
        asc(tvEpisodes.seriesSlug),
        asc(tvEpisodes.episodeNumber),
        asc(tvEpisodes.partNumber),
        asc(tvEpisodes.createdAt),
      );

    return NextResponse.json({ episodes: rows });
  } catch (error) {
    console.error('tv episodes GET error:', error);
    return NextResponse.json({ error: 'Failed to load episodes', episodes: [] }, { status: 500 });
  }
}
