'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import LoadingBar from '../components/LoadingBar';
import { useUserProfile } from '../hooks/useUserProfile';

interface HostedEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  city: string | null;
  imageUrl: string | null;
}

type Tab = 'overview' | 'worlds' | 'events';

const navItems: { key: Tab; label: string; icon: JSX.Element }[] = [
  {
    key: 'overview', label: 'Overview',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    key: 'worlds', label: 'Worlds',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/></svg>,
  },
  {
    key: 'events', label: 'Events',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  },
];

export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { profile, worldMemberships, loading } = useUserProfile();
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === 'world_builder' ? -1 : 1;
    });
  }, [worldMemberships]);

  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/events?hostUserId=${profile.id}`)
      .then(r => r.json())
      .then(data => setHostedEvents(data.events || []))
      .catch(console.error);
  }, [profile?.id]);

  useEffect(() => {
    if (ready && !authenticated) router.push('/');
  }, [ready, authenticated, router]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <div className="flex items-center justify-center pt-40">
          <LoadingBar />
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  const displayName = profile?.name || 'Anonymous';
  const initial = (displayName[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden relative z-10" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />

      {/* Mobile tab bar */}
      <div className="sm:hidden fixed top-[60px] left-0 right-0 z-30 overflow-x-auto border-b" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        <div className="flex px-4 py-2 gap-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap transition-all shrink-0 cursor-pointer"
              style={activeTab === item.key
                ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                : { color: 'var(--foreground)', opacity: 0.3 }
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex flex-col fixed top-0 left-0 h-full w-56 pt-20 z-20 border-r" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
        {/* Dashboard label */}
        <div className="px-5 pt-2 pb-4">
          <p className="font-mono text-[9px] uppercase tracking-widest opacity-30" style={{ color: 'var(--foreground)' }}>Dashboard</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-[11px] transition-all cursor-pointer"
              style={activeTab === item.key
                ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                : { color: 'var(--foreground)', opacity: 0.5 }
              }
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              <span className="uppercase tracking-widest">{item.label}</span>
              {item.key === 'worlds' && worldMemberships.length > 0 && (
                <span className="ml-auto font-mono text-[9px] opacity-50">{worldMemberships.length}</span>
              )}
              {item.key === 'events' && hostedEvents.length > 0 && (
                <span className="ml-auto font-mono text-[9px] opacity-50">{hostedEvents.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-5 py-4 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
          {profile?.username && (
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View Profile
            </Link>
          )}
          <Link href="/profile" className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70 transition" style={{ color: 'var(--foreground)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Profile
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="pt-28 sm:pt-24 sm:ml-56 px-4 sm:px-8 pb-16">
        <div className="max-w-4xl">

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
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
                  <p className="font-mono text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--foreground)' }}>{worldMemberships.filter(w => w.role === 'world_builder').length}</p>
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
                  {worldMemberships.some(wm => wm.role === 'world_builder') && (
                    <Link href="/dashboard/create-world" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                      + Create World
                    </Link>
                  )}
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
          )}

          {/* ═══ WORLDS TAB ═══ */}
          {activeTab === 'worlds' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Worlds</h1>
                {worldMemberships.some(wm => wm.role === 'world_builder') && (
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
                            {wm.role === 'world_builder' ? 'Builder' : 'Collab'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/worlds/${wm.worldSlug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                            View
                          </Link>
                          {wm.role === 'world_builder' && (
                            <Link href={`/worlds/${wm.worldSlug}/edit`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                              Manage
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ EVENTS TAB ═══ */}
          {activeTab === 'events' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Events</h1>
                <Link href="/dashboard/create-event" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)' }}>
                  + Create Event
                </Link>
              </div>

              {hostedEvents.length === 0 ? (
                <div className="border rounded-xl p-10 text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="font-mono text-[13px] opacity-40 mb-4" style={{ color: 'var(--foreground)' }}>You haven&apos;t hosted any events yet</p>
                  <Link href="/dashboard/create-event" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    Create an Event
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hostedEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="border rounded-xl overflow-hidden group"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                    >
                      {/* Image */}
                      {ev.imageUrl ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video" style={{ backgroundColor: 'var(--foreground)', opacity: 0.05 }} />
                      )}

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-mono text-[13px] font-bold uppercase truncate mb-1" style={{ color: 'var(--foreground)' }}>{ev.eventName}</h3>
                        {(ev.date || ev.city) && (
                          <p className="font-mono text-[10px] opacity-40 mb-3" style={{ color: 'var(--foreground)' }}>
                            {[ev.date, ev.city].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Link href={`/events/${ev.slug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                            View
                          </Link>
                          <Link href={`/dashboard/edit-event/${ev.slug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
