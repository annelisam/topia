import { db } from '@/lib/db';
import { tvEpisodes } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';

/**
 * All published Topia TV episodes ordered series → episode → part → createdAt.
 * Shared by /api/tv/episodes and the server-rendered /home page.
 */
export async function getTvEpisodes() {
  return db
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
}
