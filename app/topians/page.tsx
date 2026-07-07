import type { Metadata } from 'next';
import { getPublicProfiles } from '@/lib/profile/list';
import TopiansClient from './TopiansClient';

// The directory is public and viewer-independent, so it server-renders (the
// grid — and its LCP image — lands in the initial HTML instead of behind a
// client fetch). Same data source as /api/profiles?all=1.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Topians | TOPIA',
  description: 'Everyone building, shaping, and moving through TOPIA — the full community directory.',
  alternates: { canonical: 'https://topia.vision/topians' },
};

export default async function TopiansPage() {
  const profiles = await getPublicProfiles({ limit: 500 });
  return (
    <TopiansClient
      initialProfiles={profiles.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
    />
  );
}
