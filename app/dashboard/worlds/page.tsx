'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useDashboard } from '../_components/DashboardContext';

export default function DashboardWorldsPage() {
  const { worldMemberships } = useDashboard();
  const { user } = usePrivy();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Optimistic published overrides keyed by worldId (membership list is
  // context-derived, so we apply local state after archive/restore).
  const [pubOverride, setPubOverride] = useState<Record<string, boolean>>({});

  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      const priority = (r: string) => r === 'owner' ? 0 : r === 'world_builder' ? 1 : 2;
      return priority(a.role) - priority(b.role);
    });
  }, [worldMemberships]);

  const isPublished = (worldId: string, fallback: boolean | undefined) =>
    pubOverride[worldId] ?? (fallback ?? true);

  // Owner-only soft remove / restore — flips worlds.published. Recoverable.
  const setPublished = async (worldId: string, published: boolean) => {
    if (!user?.id) return;
    setBusyId(worldId);
    try {
      const res = await fetch('/api/worlds/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, worldId, published }),
      });
      if (res.ok) setPubOverride((p) => ({ ...p, [worldId]: published }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Worlds</h1>
        <Link href="/dashboard/create-world" className="font-mono text-[13px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)' }}>
          + Create World
        </Link>
      </div>

      {sortedWorlds.length === 0 ? (
        <div className="border rounded-xl p-10 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[13px] opacity-40 mb-4" style={{ color: 'var(--foreground)' }}>You haven&apos;t joined any worlds yet</p>
          <Link href="/worlds" className="font-mono text-[13px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            Explore Worlds
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedWorlds.map(wm => (
            <div
              key={wm.worldId}
              className="border rounded-xl overflow-hidden group relative"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
            >
              {/* Image */}
              <div className="aspect-video overflow-hidden" style={{ backgroundColor: 'var(--foreground)', opacity: wm.worldImageUrl ? 1 : 0.05 }}>
                {wm.worldImageUrl && (
                  <img src={wm.worldImageUrl} alt={wm.worldTitle} className="w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-mono text-[13px] font-bold uppercase truncate" style={{ color: 'var(--foreground)' }}>{wm.worldTitle}</h3>
                  <span className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {!isPublished(wm.worldId, wm.worldPublished) && (
                      <span className="font-mono text-[12px] uppercase tracking-wide opacity-50 px-1.5 py-0.5 rounded border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                        Archived
                      </span>
                    )}
                    <span className="font-mono text-[12px] uppercase tracking-wide opacity-40" style={{ color: 'var(--foreground)' }}>
                      {wm.role === 'owner' ? 'Owner' : wm.role === 'world_builder' ? 'Builder' : 'Collab'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/worlds/${wm.worldSlug}`} className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    View
                  </Link>
                  <Link href={`/dashboard/worlds/${wm.worldSlug}`} className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                    Manage
                  </Link>
                  {wm.role === 'owner' && (
                    isPublished(wm.worldId, wm.worldPublished) ? (
                      <button
                        onClick={() => setPublished(wm.worldId, false)}
                        disabled={busyId === wm.worldId}
                        className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition disabled:opacity-40 cursor-pointer bg-transparent"
                        style={{ color: '#FF5C34', borderColor: 'var(--border-color)' }}
                        title="Hide from the public site (recoverable)"
                      >
                        {busyId === wm.worldId ? '…' : 'Remove'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setPublished(wm.worldId, true)}
                        disabled={busyId === wm.worldId}
                        className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition disabled:opacity-40 cursor-pointer bg-transparent"
                        style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                        title="Restore to the public site"
                      >
                        {busyId === wm.worldId ? '…' : 'Restore'}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
