import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// Profile pages render client-side, so OG/Twitter metadata (incl. the card
// image used as the link-preview thumbnail on socials + messages) lives here in
// the server layout.
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'topia.vision';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const base = `${proto}://${host}`;
  const image = `${base}/api/profile/${encodeURIComponent(username)}/card?format=og`;

  const [u] = await db
    .select({ name: users.name })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);

  const who = u?.name?.trim() || `@${username}`;
  const title = `${who} on TOPIA`;
  const description = 'A creator engine for artists, by artists.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{ url: image, width: 1200, height: 630, alt: `${who} — Topia card` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
