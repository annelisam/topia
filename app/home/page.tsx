import type { Metadata } from 'next';
import { getTvEpisodes } from '@/lib/tv/episodes';
import { getEventsOverview } from '@/lib/events/overview';
import { getPublicProfiles } from '@/lib/profile/list';
import HomeClient from './HomeClient';

// Public data (Discover carousel, events rail, TV guide) is server-rendered;
// the viewer's profile-completeness check hydrates client-side.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Home | TOPIA',
  description: 'Discover creators, events, worlds, and Topia TV — the TOPIA network home.',
  alternates: { canonical: 'https://topia.vision/home' },
};

export default async function HomePage() {
  const [episodes, overview, profiles] = await Promise.all([
    getTvEpisodes(),
    getEventsOverview(),
    getPublicProfiles({ limit: 24, completeOnly: true }),
  ]);

  return (
    <HomeClient
      initialEpisodes={episodes}
      initialEvents={overview.events}
      initialProfiles={profiles}
    />
  );
}
