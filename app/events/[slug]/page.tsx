import { Metadata } from 'next';
import { db, events } from '@/lib/db';
import { eq } from 'drizzle-orm';
import EventDetailClient from './EventDetailClient';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const [event] = await db
    .select({
      eventName: events.eventName,
      description: events.description,
      imageUrl: events.imageUrl,
      city: events.city,
      date: events.date,
    })
    .from(events)
    .where(eq(events.slug, slug));

  if (!event) {
    return { title: 'Event Not Found | TOPIA' };
  }

  const title = `${event.eventName} | TOPIA`;
  const description = event.description
    ? event.description.slice(0, 160).replace(/\n/g, ' ')
    : [event.date, event.city].filter(Boolean).join(' · ') || 'An event on TOPIA';

  // Only use HTTP(S) URLs for OG images — base64 data URLs won't work
  const ogImage = event.imageUrl && event.imageUrl.startsWith('http') ? event.imageUrl : undefined;

  return {
    title,
    description,
    openGraph: {
      title: event.eventName,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 1200, alt: event.eventName }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: event.eventName,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
