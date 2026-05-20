import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import { tvEpisodes } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const res = await db
    .update(tvEpisodes)
    .set({ thumbnailUrl: null })
    .where(eq(tvEpisodes.seriesSlug, 'topiaview'))
    .returning({ slug: tvEpisodes.slug });
  console.log('Cleared thumbnailUrl on:', res.map((r) => r.slug).join(', ') || '(no rows)');
  process.exit(0);
}
main();
