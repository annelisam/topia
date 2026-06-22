'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'topia.recentlyViewedWorlds';
const MAX_RECENT = 6;

export interface RecentWorld {
  slug: string;
  title: string;
  imageUrl: string | null;
  viewedAt: number;
}

/** Hook to record a world view (mount-and-store on world detail pages). */
export function useRecordWorldView(world: { slug: string; title: string; imageUrl?: string | null } | null) {
  useEffect(() => {
    if (!world?.slug || !world?.title) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: RecentWorld[] = raw ? JSON.parse(raw) : [];
      const entry: RecentWorld = { slug: world.slug, title: world.title, imageUrl: world.imageUrl ?? null, viewedAt: Date.now() };
      const deduped = [entry, ...list.filter((w) => w.slug !== world.slug)].slice(0, MAX_RECENT * 2);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
    } catch { /* ignore quota / serialization errors */ }
  }, [world?.slug, world?.title, world?.imageUrl]);
}

export default function RecentlyViewedWorldsWidget() {
  const [items, setItems] = useState<RecentWorld[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list: RecentWorld[] = JSON.parse(raw);
      setItems(list.slice(0, MAX_RECENT));
    } catch { /* ignore */ }
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden mb-6 bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40">Recently viewed</span>
        <Link href="/worlds" className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink no-underline">
          all worlds →
        </Link>
      </div>
      <div className="p-3 flex flex-wrap gap-2">
        {items.map((w) => (
          <Link
            key={w.slug}
            href={`/worlds/${w.slug}`}
            className="inline-flex items-center gap-2 border border-ink/10 hover:border-lime/40 px-2.5 py-1.5 rounded-sm transition no-underline"
          >
            {w.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={w.imageUrl} alt="" className="w-5 h-5 rounded-sm object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-sm bg-ink/10 flex items-center justify-center">
                <span className="font-basement text-[9px] text-ink/40">{w.title[0]?.toUpperCase()}</span>
              </span>
            )}
            <span className="font-mono text-[11px] text-ink">{w.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
