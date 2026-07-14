import { Metadata } from 'next';
import { db, worlds, worldProjects } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

type Props = { params: Promise<{ slug: string; projectSlug: string }> };

// Project pages previously inherited the WORLD's OG card from the world
// layout — a shared project link showed the wrong title/image. This gives
// each project its own metadata.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, projectSlug } = await params;

  const [row] = await db
    .select({
      projectName: worldProjects.name,
      projectDescription: worldProjects.description,
      projectImageUrl: worldProjects.imageUrl,
      worldTitle: worlds.title,
    })
    .from(worldProjects)
    .innerJoin(worlds, eq(worlds.id, worldProjects.worldId))
    .where(and(eq(worlds.slug, slug), eq(worldProjects.slug, projectSlug)))
    .limit(1);

  if (!row) {
    return { title: 'Project Not Found | TOPIA' };
  }

  const title = `${row.projectName} · ${row.worldTitle} | TOPIA`;
  const description = row.projectDescription || `A project from ${row.worldTitle}, a world on TOPIA`;
  // Only HTTP(S) URLs work for OG images — base64 data URLs don't.
  const ogImage = row.projectImageUrl && row.projectImageUrl.startsWith('http') ? row.projectImageUrl : undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://topia.vision/worlds/${slug}/projects/${projectSlug}` },
    openGraph: {
      title: `${row.projectName} — ${row.worldTitle}`,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, alt: row.projectName }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: `${row.projectName} — ${row.worldTitle}`,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
