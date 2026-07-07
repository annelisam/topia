import { Metadata } from 'next';
import { db, worlds } from '@/lib/db';
import { eq } from 'drizzle-orm';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [world] = await db
    .select({
      title: worlds.title,
      shortDescription: worlds.shortDescription,
      description: worlds.description,
      imageUrl: worlds.imageUrl,
      headerImageUrl: worlds.headerImageUrl,
      category: worlds.category,
    })
    .from(worlds)
    .where(eq(worlds.slug, slug));

  if (!world) {
    return { title: 'World Not Found | TOPIA' };
  }

  const title = `${world.title} | TOPIA Worlds`;
  const description =
    world.shortDescription ||
    (world.description ? world.description.slice(0, 160).replace(/\n/g, ' ') : null) ||
    [world.category, 'A world on TOPIA'].filter(Boolean).join(' · ');

  // Only use HTTP(S) URLs for OG images — base64 data URLs won't work
  const rawImage = world.headerImageUrl || world.imageUrl;
  const ogImage = rawImage && rawImage.startsWith('http') ? rawImage : undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://topia.vision/worlds/${slug}` },
    openGraph: {
      title: world.title,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, alt: world.title }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: world.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return children;
}
