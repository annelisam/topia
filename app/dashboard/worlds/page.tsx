'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDashboard } from '../_components/DashboardContext';

export default function DashboardWorldsPage() {
  const { worldMemberships } = useDashboard();

  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      const priority = (r: string) => r === 'owner' ? 0 : r === 'world_builder' ? 1 : 2;
      return priority(a.role) - priority(b.role);
    });
  }, [worldMemberships]);

  const hasBuilderRole = worldMemberships.some(wm => wm.role === 'world_builder' || wm.role === 'owner');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Worlds</h1>
        {hasBuilderRole && (
          <Link href="/dashboard/create-world" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)' }}>
            + Create World
          </Link>
        )}
      </div>

      {sortedWorlds.length === 0 ? (
        <div className="border rounded-xl p-10 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[13px] opacity-40 mb-4" style={{ color: 'var(--foreground)' }}>You haven&apos;t joined any worlds yet</p>
          <Link href="/worlds" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
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
                  <span className="font-mono text-[9px] uppercase tracking-wide opacity-40 shrink-0 mt-0.5" style={{ color: 'var(--foreground)' }}>
                    {wm.role === 'owner' ? 'Owner' : wm.role === 'world_builder' ? 'Builder' : 'Collab'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/worlds/${wm.worldSlug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    View
                  </Link>
                  <Link href={`/dashboard/worlds/${wm.worldSlug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
