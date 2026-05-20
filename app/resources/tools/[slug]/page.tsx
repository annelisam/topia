import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { tools } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ToolFullPageClient from './ToolFullPageClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [tool] = await db
      .select({ name: tools.name, description: tools.description, category: tools.category })
      .from(tools)
      .where(eq(tools.slug, slug))
      .limit(1);

    if (!tool) {
      return {
        title: 'Tool not found · TOPIA',
        description: 'This tool could not be found.',
      };
    }

    const title = `${tool.name} · TOPIA Tools`;
    const description =
      tool.description?.slice(0, 200)
      ?? `${tool.name}${tool.category ? ` — ${tool.category}` : ''}. Discover creators and worlds using ${tool.name} on TOPIA.`;
    const faviconImg = `https://www.google.com/s2/favicons?domain=${slug}&sz=128`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'TOPIA',
        images: [{ url: faviconImg, alt: tool.name }],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [faviconImg],
      },
    };
  } catch {
    return { title: 'TOPIA Tools' };
  }
}

export default async function ToolFullPage({ params }: PageProps) {
  const { slug } = await params;
  return <ToolFullPageClient slug={slug} />;
}
