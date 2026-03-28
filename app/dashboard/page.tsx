'use client';

import Link from 'next/link';
import { useDashboard } from './_components/DashboardContext';

export default function DashboardOverviewPage() {
  const { profile, worldMemberships, hostedEvents } = useDashboard();

  const displayName = profile?.name || 'Anonymous';
  const initial = (displayName[0] || '?').toUpperCase();

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold uppercase mb-6" style={{ color: 'var(--foreground)' }}>Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{worldMemberships.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Worlds</p>
        </div>
        <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{hostedEvents.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Events</p>
        </div>
        <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{worldMemberships.filter(w => w.role === 'world_builder' || w.role === 'owner').length}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-40" style={{ color: 'var(--foreground)' }}>Builder Roles</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <p className="block font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5 font-bold opacity-40" style={{ color: 'var(--foreground)' }}>Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/create-event" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            + Create Event
          </Link>
          <Link href="/dashboard/submit-tool" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            + Submit Tool
          </Link>
          <Link href="/dashboard/submit-grant" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            + Submit Grant
          </Link>
          <Link href="/dashboard/create-world" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
            + Create World
          </Link>
        </div>
      </div>

      {/* Profile card */}
      <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
        <p className="block font-mono text-[9px] uppercase tracking-[0.2em] mb-3 font-bold opacity-40" style={{ color: 'var(--foreground)' }}>Profile</p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border shrink-0" style={{ borderColor: 'var(--foreground)' }}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--foreground)' }}>
                <span className="font-mono text-[20px] font-bold" style={{ color: 'var(--background)' }}>{initial}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[15px] font-bold uppercase truncate" style={{ color: 'var(--foreground)' }}>{displayName}</p>
            {profile?.username && (
              <p className="font-mono text-[12px] opacity-40 mb-1" style={{ color: 'var(--foreground)' }}>@{profile.username}</p>
            )}
            {profile?.bio && (
              <p className="font-mono text-[12px] opacity-60 line-clamp-2" style={{ color: 'var(--foreground)' }}>
                {profile.bio.length > 120 ? profile.bio.slice(0, 120) + '...' : profile.bio}
              </p>
            )}
          </div>
          <Link href="/profile" className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition shrink-0" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
