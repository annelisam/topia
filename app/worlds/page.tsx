import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { worlds, creators } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import WorldsPageClient from './WorldsPageClient';

// Public list, server-rendered for real LCP + crawlable HTML.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Worlds | TOPIA',
  description: 'Creator-built worlds — collectives, studios, and projects across the TOPIA network.',
  alternates: { canonical: 'https://topia.vision/worlds' },
};

export default async function WorldsPage() {
  const rows = await db
    .select({
      title: worlds.title,
      slug: worlds.slug,
      description: worlds.description,
      category: worlds.category,
      imageUrl: worlds.imageUrl,
      country: worlds.country,
      dateAdded: worlds.dateAdded,
      creatorName: creators.name,
      creatorSlug: creators.slug,
      creatorCountry: creators.country,
    })
    .from(worlds)
    .leftJoin(creators, eq(worlds.creatorId, creators.id))
    .where(eq(worlds.published, true))
    .orderBy(asc(worlds.displayOrder), asc(worlds.title));

  // Matches the shape the client previously built from /api/worlds (id = slug).
  const initialWorlds = rows.map((w) => ({ ...w, id: w.slug }));

  return <WorldsPageClient initialWorlds={initialWorlds} />;
}
