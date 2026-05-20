/**
 * One-time upload script for the initial two Topia TV episodes.
 *
 * Streams the local MP4s to Vercel Blob (using @vercel/blob's `put` which
 * accepts a Node stream — handles arbitrary file sizes, unlike the 4.5 MB
 * JSON body limit on serverless functions). Then inserts a tv_episodes row
 * per file with metadata.
 *
 * Run once:   npx tsx scripts/upload-tv-videos.ts
 *
 * Idempotent on the DB side: if an episode with the same slug exists, we
 * update it instead of inserting a duplicate. Blob uploads always make a
 * new blob — re-running this will create new blob URLs and orphan the old
 * ones (small cost; the old blobs can be cleaned up via the Vercel dash).
 */
import { put } from '@vercel/blob';
import { createReadStream, statSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: resolve(process.cwd(), '.env.local') }); // ensure .env.local wins
import { db, tvEpisodes } from '../lib/db';
import { eq } from 'drizzle-orm';

interface EpisodePlan {
  /** Absolute path to the local file */
  localPath: string;
  /** Stable slug — used for idempotency on the DB side */
  slug: string;
  title: string;
  description: string;
  category: 'Featured' | 'Live' | 'Series' | 'Replays';
  seriesSlug: string;
  seriesTitle: string;
  episodeNumber: number;
  partNumber: number;
  guestName: string;
  thumbnailUrl: string | null;
}

const HOME = '/Users/annelisamoody/Downloads';

const PLAN: EpisodePlan[] = [
  {
    localPath: `${HOME}/TOPIAVIEW EP 001. _ PATRONS FOR THE CULTURE, C.Y LEE (PART I).mp4`,
    slug: 'patrons-for-the-culture-cy-lee-part-i',
    title: 'Patrons for the Culture · C.Y Lee · Part I',
    description: 'TOPIAVIEW Episode 001 — Part I. A conversation with C.Y Lee on patronage, culture, and what it takes to back artists in the wild.',
    category: 'Featured',
    seriesSlug: 'topiaview',
    seriesTitle: 'TOPIAVIEW',
    episodeNumber: 1,
    partNumber: 1,
    guestName: 'C.Y Lee',
    thumbnailUrl: null,
  },
  {
    localPath: `${HOME}/TOPIAVIEW EP 001. _ PATRONS FOR THE CULTURE, C.Y LEE (PART II).mp4`,
    slug: 'patrons-for-the-culture-cy-lee-part-ii',
    title: 'Patrons for the Culture · C.Y Lee · Part II',
    description: 'TOPIAVIEW Episode 001 — Part II. The conversation continues with C.Y Lee on building patron systems for the next generation.',
    category: 'Featured',
    seriesSlug: 'topiaview',
    seriesTitle: 'TOPIAVIEW',
    episodeNumber: 1,
    partNumber: 2,
    guestName: 'C.Y Lee',
    thumbnailUrl: null,
  },
];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('✗ BLOB_READ_WRITE_TOKEN missing — set it in .env.local');
    process.exit(1);
  }

  for (const ep of PLAN) {
    const sizeBytes = statSync(ep.localPath).size;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
    console.log(`\n→ ${ep.slug}  (${sizeMB} MB)`);

    const ext = ep.localPath.split('.').pop() ?? 'mp4';
    const key = `tv/${ep.slug}.${ext}`;
    const stream = createReadStream(ep.localPath);

    console.log(`  uploading to Blob: ${key} …`);
    const blob = await put(key, stream, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,                              // re-runs replace cleanly
      cacheControlMaxAge: 60 * 60 * 24 * 365,            // 1 year (URL is content-hashed by Blob anyway)
    });
    console.log(`  → ${blob.url}`);

    // Insert or update the DB row by slug
    const existing = await db.select({ id: tvEpisodes.id }).from(tvEpisodes).where(eq(tvEpisodes.slug, ep.slug)).limit(1);
    const payload = {
      slug: ep.slug,
      title: ep.title,
      description: ep.description,
      category: ep.category,
      seriesSlug: ep.seriesSlug,
      seriesTitle: ep.seriesTitle,
      episodeNumber: ep.episodeNumber,
      partNumber: ep.partNumber,
      videoUrl: blob.url,
      thumbnailUrl: ep.thumbnailUrl,
      guestName: ep.guestName,
      published: true,
    } as const;

    if (existing.length > 0) {
      await db.update(tvEpisodes).set(payload).where(eq(tvEpisodes.id, existing[0].id));
      console.log(`  ✓ updated existing tv_episodes row`);
    } else {
      await db.insert(tvEpisodes).values(payload);
      console.log(`  ✓ inserted new tv_episodes row`);
    }
  }

  console.log('\n✓ Done. Visit /tv to verify.');
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Upload failed:', err);
  process.exit(1);
});
