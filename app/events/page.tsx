import type { Metadata } from 'next';
import { getEventsOverview } from '@/lib/events/overview';
import EventsPageClient from './EventsPageClient';

// The anonymous event list is server-rendered (real LCP + crawlable HTML) and
// revalidated every minute; viewer-specific flags hydrate client-side.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Events | TOPIA',
  description: 'Gatherings, launches, sessions, rituals — events from the TOPIA community.',
  alternates: { canonical: 'https://topia.vision/events' },
};

export default async function EventsPage() {
  const overview = await getEventsOverview();
  return <EventsPageClient initialEvents={overview.events} initialCities={overview.cities} />;
}
