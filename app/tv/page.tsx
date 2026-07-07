import type { Metadata } from 'next';
import { getTvEpisodes } from '@/lib/tv/episodes';
import TvClient from './TvClient';

// The guide is public and viewer-independent, so the episode list (and the
// player, which is the LCP element) server-renders; playback state stays
// client-side in TvClient.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Topia TV | TOPIA',
  description: 'Series, live sessions, and replays from the TOPIA network.',
  alternates: { canonical: 'https://topia.vision/tv' },
};

export default async function TVPage() {
  let episodes: Awaited<ReturnType<typeof getTvEpisodes>> = [];
  try {
    episodes = await getTvEpisodes();
  } catch (error) {
    // DB hiccup — TvClient falls back to its client fetch + retry UI.
    console.error('[tv] SSR episodes failed:', error);
  }
  return <TvClient initialEpisodes={episodes.map(({ publishedAt: _publishedAt, ...ep }) => ep)} />;
}
