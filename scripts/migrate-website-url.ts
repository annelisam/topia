/**
 * Migration: Move worlds.websiteUrl into socialLinks.website
 *
 * For each world that has a websiteUrl but no socialLinks.website,
 * copies websiteUrl into socialLinks.website, then clears websiteUrl.
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../lib/db';
import { worlds } from '../lib/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
}

async function migrate() {
  console.log('Fetching worlds with websiteUrl...');
  const allWorlds = await db
    .select({
      id: worlds.id,
      title: worlds.title,
      websiteUrl: worlds.websiteUrl,
      socialLinks: worlds.socialLinks,
    })
    .from(worlds)
    .where(isNotNull(worlds.websiteUrl));

  console.log(`Found ${allWorlds.length} worlds with websiteUrl set.`);

  for (const w of allWorlds) {
    const existing = (w.socialLinks as SocialLinks) || {};
    // Only migrate if socialLinks.website is not already set
    if (!existing.website && w.websiteUrl) {
      const updated: SocialLinks = { ...existing, website: w.websiteUrl };
      await db.update(worlds).set({
        socialLinks: updated,
        websiteUrl: null,
        updatedAt: new Date(),
      }).where(eq(worlds.id, w.id));
      console.log(`  Migrated "${w.title}": ${w.websiteUrl} → socialLinks.website`);
    } else if (existing.website) {
      // socialLinks.website already exists, just clear websiteUrl
      await db.update(worlds).set({
        websiteUrl: null,
        updatedAt: new Date(),
      }).where(eq(worlds.id, w.id));
      console.log(`  Cleared websiteUrl for "${w.title}" (socialLinks.website already set: ${existing.website})`);
    }
  }

  console.log('Done!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
