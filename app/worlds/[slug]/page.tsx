'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navigation from '../../components/Navigation';

interface WorldDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
  tools: string | null;
  collaborators: string | null;
  dateAdded: string | null;
  creatorName: string | null;
  creatorSlug: string | null;
  creatorWebsiteUrl: string | null;
  creatorCountry: string | null;
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', SE: '🇸🇪', DE: '🇩🇪', NL: '🇳🇱', GB: '🇬🇧',
  FR: '🇫🇷', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', IT: '🇮🇹',
};

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/worlds?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        // API returns array filtered by category; we need a single-world endpoint
        // For now, find by slug from the worlds array
        if (data.worlds && data.worlds.length > 0) {
          setWorld(data.worlds[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[11px]" style={{ color: '#1a1a1a' }}>Loading...</p>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#f5f0e8' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[11px] mb-4" style={{ color: '#1a1a1a' }}>World not found.</p>
        <Link href="/worlds" className="font-mono text-[11px] underline" style={{ color: '#1a1a1a' }}>← Back to Worlds</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8' }}>
      <Navigation currentPage="worlds" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        {/* Back link */}
        <Link href="/worlds" className="font-mono text-[11px] hover:opacity-60 transition mb-8 inline-block" style={{ color: '#1a1a1a' }}>
          ← WORLDS
        </Link>

        <div className="max-w-3xl">
          {/* Category + flag header row */}
          <div className="flex items-center gap-3 mb-3">
            {world.category && (
              <span className="font-mono text-[11px] px-3 py-1 border" style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}>
                {world.category}
              </span>
            )}
            {world.creatorCountry && (
              <span className="font-mono text-[16px]">{FLAG_MAP[world.creatorCountry] || world.creatorCountry}</span>
            )}
          </div>

          {/* Image placeholder */}
          <div className="w-full h-48 sm:h-64 mb-6 flex items-center justify-center font-mono text-[11px]" style={{ backgroundColor: '#1a1a1a', color: '#f5f0e8', opacity: 0.15 }}>
            IMAGE
          </div>

          {/* Title */}
          <h1 className="font-mono text-[20px] sm:text-[26px] font-bold uppercase mb-3" style={{ color: '#1a1a1a' }}>
            {world.title}
          </h1>

          {/* Description */}
          {world.description && (
            <p className="font-mono text-[11px] sm:text-[12px] leading-relaxed mb-6 max-w-xl" style={{ color: '#1a1a1a' }}>
              {world.description}
            </p>
          )}

          {/* Meta info */}
          <div className="space-y-2 font-mono text-[11px] mb-6" style={{ color: '#1a1a1a' }}>
            {world.creatorName && (
              <p>
                <span className="font-bold">BUILT BY:</span>{' '}
                <Link
                  href={`/worlds/creator/${world.creatorSlug}`}
                  className="hover:opacity-60 transition underline"
                >
                  {world.creatorName}
                </Link>
              </p>
            )}

            {world.tools && (
              <p>
                <span className="font-bold">TOOLS IN USE:</span> {world.tools}
              </p>
            )}

            {world.collaborators && (
              <p>
                <span className="font-bold">COLLABORATORS:</span> {world.collaborators}
              </p>
            )}

            {world.creatorWebsiteUrl && (
              <p>
                <span className="font-bold">WEBSITE:</span>{' '}
                <a
                  href={world.creatorWebsiteUrl.startsWith('http') ? world.creatorWebsiteUrl : `https://${world.creatorWebsiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition underline"
                >
                  {world.creatorWebsiteUrl}
                </a>
              </p>
            )}

            {world.dateAdded && (
              <p>
                <span className="font-bold">ADDED:</span> {world.dateAdded}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
