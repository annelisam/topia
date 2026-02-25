'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Navigation from '../../../components/Navigation';

interface CreatorWorld {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  country: string | null;
  dateAdded: string | null;
}

interface Creator {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  websiteUrl: string | null;
  country: string | null;
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', SE: '🇸🇪', DE: '🇩🇪', NL: '🇳🇱', GB: '🇬🇧',
  FR: '🇫🇷', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', IT: '🇮🇹',
};

export default function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [worlds, setWorlds] = useState<CreatorWorld[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/creators?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creator) {
          setCreator(data.creator);
          setWorlds(data.worlds || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>Loading...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>Creator not found.</p>
        <Link href="/worlds" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Worlds</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="worlds" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        {/* Back link */}
        <Link href="/worlds" className="font-mono text-[13px] hover:opacity-60 transition mb-8 inline-block" style={{ color: 'var(--foreground)' }}>
          ← WORLDS
        </Link>

        {/* Creator header */}
        <div className="max-w-2xl">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="font-mono text-[18px] sm:text-[22px] font-bold uppercase" style={{ color: 'var(--foreground)' }}>
              {creator.name}
            </h1>
            {creator.country && (
              <span className="font-mono text-[16px] mt-0.5">{FLAG_MAP[creator.country] || creator.country}</span>
            )}
          </div>

          {creator.description && (
            <p className="font-mono text-[13px] sm:text-[12px] leading-relaxed mb-3" style={{ color: 'var(--foreground)' }}>
              {creator.description}
            </p>
          )}

          {creator.websiteUrl && (
            <a
              href={creator.websiteUrl.startsWith('http') ? creator.websiteUrl : `https://${creator.websiteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] hover:opacity-60 transition underline"
              style={{ color: 'var(--foreground)' }}
            >
              {creator.websiteUrl}
            </a>
          )}
        </div>

        {/* Divider */}
        <div className="border-t my-8" style={{ borderColor: 'var(--foreground)' }} />

        {/* Worlds by this creator */}
        <h2 className="font-mono text-[13px] uppercase mb-4" style={{ color: 'var(--foreground)' }}>
          Worlds ({worlds.length})
        </h2>

        {worlds.length === 0 ? (
          <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)', opacity: 0.5 }}>No worlds yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {worlds.map((world) => (
              <Link
                key={world.id}
                href={`/worlds/${world.slug}`}
                className="border p-5 sm:p-6 hover:opacity-70 transition group block"
                style={{ borderColor: 'var(--foreground)', backgroundColor: 'var(--background)' }}
              >
                {world.imageUrl ? (
                  <div className="w-full h-36 mb-4 overflow-hidden">
                    <img
                      src={world.imageUrl}
                      alt={world.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 mb-4 flex items-center justify-center font-mono text-[12px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', opacity: 0.15 }}>
                    IMAGE
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-mono text-[13px] uppercase font-bold group-hover:underline" style={{ color: 'var(--foreground)' }}>
                    {world.title}
                  </h3>
                  {world.category && (
                    <span className="font-mono text-[12px] px-2 py-0.5 border" style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)' }}>
                      {world.category}
                    </span>
                  )}
                </div>

                {world.description && (
                  <p className="font-mono text-[13px] mb-3" style={{ color: 'var(--foreground)' }}>{world.description}</p>
                )}

                {world.dateAdded && (
                  <p className="font-mono text-[12px]" style={{ color: 'var(--foreground)', opacity: 0.5 }}>{world.dateAdded}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
