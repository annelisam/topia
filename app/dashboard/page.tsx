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

export default function DashboardPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { profile, worldMemberships, loading } = useUserProfile();
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);

  // Sort worlds: builders first, then collaborators
  const sortedWorlds = useMemo(() => {
    return [...worldMemberships].sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === 'world_builder' ? -1 : 1;
    });
  }, [worldMemberships]);

  // Fetch hosted events
  useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/events?hostUserId=${profile.id}`)
      .then(r => r.json())
      .then(data => setHostedEvents(data.events || []))
      .catch(console.error);
  }, [profile?.id]);

  // Redirect if not authenticated
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
  const bioSnippet = profile?.bio
    ? profile.bio.length > 120
      ? profile.bio.slice(0, 120) + '...'
      : profile.bio
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />

      <main className="container mx-auto max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <h1
            className="font-mono text-[13px] uppercase tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            DASHBOARD
          </h1>
        </div>

        {/* Profile Summary Card */}
        <div
          className="border p-5 sm:p-6 mb-8 sm:mb-10 rounded-2xl"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
        >
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border flex-shrink-0"
              style={{ borderColor: 'var(--foreground)' }}
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--foreground)' }}
                >
                  <span className="font-mono text-[20px] font-bold" style={{ color: 'var(--background)' }}>
                    {initial}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2
                className="font-mono text-[16px] sm:text-[18px] font-bold uppercase truncate"
                style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
              >
                {displayName}
              </h2>
              {profile?.username && (
                <p className="font-mono text-[13px] opacity-50 mb-2" style={{ color: 'var(--foreground)' }}>
                  @{profile.username}
                </p>
              )}
              {bioSnippet && (
                <p className="font-mono text-[13px] opacity-70 mb-3" style={{ color: 'var(--foreground)' }}>
                  {bioSnippet}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {profile?.username && (
                  <Link
                    href={`/profile/${profile.username}`}
                    className="inline-block font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-lg hover:opacity-70 transition"
                    style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  >
                    VIEW PROFILE
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="inline-block font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-lg hover:opacity-70 transition"
                  style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                >
                  EDIT PROFILE
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {worldMemberships.length > 0 && (
          <div className="mb-8 sm:mb-10">
            <h2
              className="font-mono text-[13px] uppercase tracking-tight mb-4"
              style={{ color: 'var(--foreground)' }}
            >
              ACTIONS
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/submit-tool"
                className="font-mono text-[13px] uppercase tracking-tight border px-4 py-2 rounded-lg hover:opacity-70 transition"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                SUBMIT A TOOL
              </Link>
              <Link
                href="/dashboard/submit-grant"
                className="font-mono text-[13px] uppercase tracking-tight border px-4 py-2 rounded-lg hover:opacity-70 transition"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                SUBMIT A GRANT
              </Link>
              {worldMemberships.some((wm) => wm.role === 'world_builder') && (
                <Link
                  href="/dashboard/create-world"
                  className="font-mono text-[13px] uppercase tracking-tight border px-4 py-2 rounded-lg hover:opacity-70 transition"
                  style={{
                    color: 'var(--background)',
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--foreground)',
                  }}
                >
                  CREATE A WORLD
                </Link>
              )}
            </div>
          </div>
        )}

        {/* My Events Section */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2
              className="font-mono text-[13px] uppercase tracking-tight"
              style={{ color: 'var(--foreground)' }}
            >
              MY EVENTS ({hostedEvents.length})
            </h2>
            <Link
              href="/dashboard/create-event"
              className="font-mono text-[12px] uppercase tracking-widest hover:opacity-70 transition"
              style={{ color: 'var(--foreground)' }}
            >
              + Create Event
            </Link>
          </div>

          {hostedEvents.length === 0 ? (
            <div
              className="border p-8 sm:p-10 text-center rounded-2xl"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <p
                className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-4"
                style={{ color: 'var(--foreground)' }}
              >
                You haven&apos;t hosted any events yet
              </p>
              <Link
                href="/dashboard/create-event"
                className="inline-block font-mono text-[13px] uppercase tracking-tight border px-4 py-2 rounded-lg hover:opacity-70 transition"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                CREATE AN EVENT
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {hostedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="border rounded-2xl overflow-hidden transition-colors duration-200 group flex flex-col"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                >
                  {ev.imageUrl && (
                    <div className="aspect-square overflow-hidden">
                      <img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <h3
                      className="font-mono text-[15px] sm:text-[16px] font-bold uppercase group-hover:underline mb-1"
                      style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
                    >
                      {ev.eventName}
                    </h3>
                    {(ev.date || ev.city) && (
                      <p className="font-mono text-[11px] opacity-50 mb-3" style={{ color: 'var(--foreground)' }}>
                        {[ev.date, ev.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <div className="flex-grow" />
                    <div className="flex items-center gap-3 mt-2">
                      <Link
                        href={`/events/${ev.slug}`}
                        className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-full hover:opacity-70 transition"
                        style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                      >
                        VIEW
                      </Link>
                      <Link
                        href={`/dashboard/edit-event/${ev.slug}`}
                        className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-full hover:opacity-70 transition"
                        style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
                      >
                        EDIT
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Worlds Section */}
        <div>
          <h2
            className="font-mono text-[13px] uppercase tracking-tight mb-4 sm:mb-6"
            style={{ color: 'var(--foreground)' }}
          >
            MY WORLDS ({worldMemberships.length})
          </h2>

          {sortedWorlds.length === 0 ? (
            <div
              className="border p-8 sm:p-10 text-center rounded-2xl"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <p
                className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-4"
                style={{ color: 'var(--foreground)' }}
              >
                You haven&apos;t joined any worlds yet
              </p>
              <Link
                href="/worlds"
                className="inline-block font-mono text-[13px] uppercase tracking-tight border px-4 py-2 rounded-lg hover:opacity-70 transition"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                EXPLORE WORLDS
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {sortedWorlds.map((wm) => (
                <div
                  key={wm.worldId}
                  className="border rounded-2xl overflow-hidden transition-colors duration-200 group flex flex-col"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                >
                  {/* World Image */}
                  <div className="aspect-video overflow-hidden" style={{ backgroundColor: 'var(--foreground)', opacity: wm.worldImageUrl ? 1 : 0.05 }}>
                    {wm.worldImageUrl && (
                      <img
                        src={wm.worldImageUrl}
                        alt={wm.worldTitle}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 35%' }}
                      />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3
                        className="font-mono text-[15px] sm:text-[16px] font-bold uppercase group-hover:underline"
                        style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}
                      >
                        {wm.worldTitle}
                      </h3>
                      <span
                        className="font-mono text-[10px] uppercase tracking-wide opacity-50 flex-shrink-0 mt-0.5"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {wm.role === 'world_builder' ? 'BUILDER' : 'COLLAB'}
                      </span>
                    </div>

                    <div className="flex-grow" />

                    {/* Action links */}
                    <div className="flex items-center gap-3 mt-2">
                      <Link
                        href={`/worlds/${wm.worldSlug}`}
                        className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-full hover:opacity-70 transition"
                        style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                      >
                        VIEW
                      </Link>
                      {wm.role === 'world_builder' && (
                        <Link
                          href={`/worlds/${wm.worldSlug}/edit`}
                          className="font-mono text-[13px] uppercase tracking-tight border px-3 py-1.5 rounded-full hover:opacity-70 transition"
                          style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
                        >
                          EDIT
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
