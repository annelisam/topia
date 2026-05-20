'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useDashboard } from './_components/DashboardContext';
import SavedToolsWidget from './_components/SavedToolsWidget';
import ProfileCompletionWidget from './_components/ProfileCompletionWidget';
import PendingInvitationsWidget from './_components/PendingInvitationsWidget';
import UpcomingEventsWidget from './_components/UpcomingEventsWidget';
import ActivityFeedWidget from './_components/ActivityFeedWidget';
import RecentlyViewedWorldsWidget from './_components/RecentlyViewedWorlds';

interface Stats {
  followers: number;
  following: number;
  worlds: number;
  events: number;
  deltas: { followers?: number; worlds?: number; events?: number };
}

function Delta({ n }: { n: number | undefined }) {
  if (!n || n <= 0) return null;
  return (
    <span className="font-mono text-[9px] uppercase tracking-[2px] text-lime/80 ml-1">+{n} mo</span>
  );
}

export default function DashboardOverviewPage() {
  const { profile, worldMemberships, hostedEvents } = useDashboard();
  const { user } = usePrivy();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/dashboard/stats?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((json) => setStats(json as Stats))
      .catch(console.error);
  }, [user?.id]);

  const displayName = profile?.name || profile?.username || 'creator';
  const initial = (displayName[0] || '?').toUpperCase();
  const builderCount = worldMemberships.filter((w) => w.role === 'world_builder' || w.role === 'owner').length;

  return (
    <div>
      {/* ─── Editorial header ─── */}
      <div className="border border-bone/[0.08] rounded-lg overflow-hidden mb-6">
        <div className="bg-lime px-4 py-3 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-obsidian/50 block">topia://dashboard</span>
            <h1 className="font-basement font-black text-[clamp(24px,4vw,40px)] uppercase leading-[0.9] text-obsidian mt-1">
              Hello, {displayName.split(' ')[0]}.
            </h1>
          </div>
          <div className="text-left md:text-right">
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-obsidian/60 block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            {profile?.username && (
              <Link
                href={`/profile/${profile.username}`}
                className="inline-block mt-1 font-mono text-[10px] uppercase tracking-[2px] text-obsidian/70 hover:text-obsidian no-underline"
              >
                view public profile →
              </Link>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-obsidian border-t border-b border-bone/[0.04] px-4 py-3 flex items-center gap-0 overflow-x-auto">
          {([
            { label: 'Worlds',    value: worldMemberships.length, delta: stats?.deltas.worlds,    href: '/worlds' },
            { label: 'Events',    value: hostedEvents.length,      delta: stats?.deltas.events,    href: '/events' },
            { label: 'Builder',   value: builderCount,             delta: undefined,                href: null },
            { label: 'Followers', value: stats?.followers ?? 0,    delta: stats?.deltas.followers, href: profile?.username ? `/profile/${profile.username}` : null },
            { label: 'Following', value: stats?.following ?? 0,    delta: undefined,                href: null },
          ] satisfies { label: string; value: number; delta?: number; href: string | null }[]).map((stat, i, arr) => {
            const inner = (
              <div className={`flex flex-col px-3 md:px-5 ${i < arr.length - 1 ? 'border-r border-bone/[0.06]' : ''} ${i === 0 ? 'pl-0' : ''}`}>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30">{stat.label}</span>
                <span className="font-mono text-[20px] md:text-[24px] text-bone font-bold leading-none mt-1 flex items-baseline">
                  {stat.value}
                  <Delta n={stat.delta} />
                </span>
              </div>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href} className="no-underline">{inner}</Link>
            ) : (
              <div key={stat.label}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations (urgent, near the top) */}
      <PendingInvitationsWidget />

      {/* Profile completion (hides when fully complete) */}
      <ProfileCompletionWidget />

      {/* Upcoming events */}
      <UpcomingEventsWidget />

      {/* Activity feed */}
      <ActivityFeedWidget />

      {/* Recently viewed */}
      <RecentlyViewedWorldsWidget />

      {/* ─── Quick actions ─── */}
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 mb-2">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/create-world"
            className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-3 py-2 rounded-sm hover:opacity-90 transition no-underline"
          >
            + Create world
          </Link>
          <Link
            href="/dashboard/create-event"
            className="font-mono text-[11px] uppercase tracking-[2px] text-bone/70 border border-bone/20 hover:border-lime/50 hover:text-bone px-3 py-2 rounded-sm transition no-underline"
          >
            + Event
          </Link>
          <Link
            href="/dashboard/submit-tool"
            className="font-mono text-[11px] uppercase tracking-[2px] text-bone/70 border border-bone/20 hover:border-lime/50 hover:text-bone px-3 py-2 rounded-sm transition no-underline"
          >
            + Tool
          </Link>
          <Link
            href="/dashboard/submit-grant"
            className="font-mono text-[11px] uppercase tracking-[2px] text-bone/70 border border-bone/20 hover:border-lime/50 hover:text-bone px-3 py-2 rounded-sm transition no-underline"
          >
            + Grant
          </Link>
        </div>
      </div>

      {/* ─── Your worlds (if any) ─── */}
      {worldMemberships.length > 0 && (
        <div className="mb-6 border border-bone/[0.08] rounded-lg overflow-hidden">
          <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">Your worlds</span>
            <Link href="/worlds" className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone no-underline">
              browse all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[3px]">
            {worldMemberships.slice(0, 4).map((w) => (
              <Link
                key={w.worldId}
                href={`/dashboard/worlds/${w.worldSlug}`}
                className="bg-obsidian border-b border-bone/[0.06] sm:border-b-0 hover:bg-bone/[0.03] transition px-4 py-3 flex items-center gap-3 no-underline"
              >
                {w.worldImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={w.worldImageUrl} alt="" className="w-9 h-9 rounded-sm object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-sm bg-lime flex items-center justify-center shrink-0">
                    <span className="font-basement text-base text-obsidian">{w.worldTitle[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{w.worldTitle}</div>
                  {w.worldCategory && <div className="font-mono text-[10px] text-bone/30 truncate">{w.worldCategory}</div>}
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/30 shrink-0">
                  {w.role === 'owner' ? 'OWNER' : w.role === 'world_builder' ? 'BUILDER' : 'COLLAB'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Saved tools */}
      <div className="mb-6">
        <SavedToolsWidget />
      </div>

      {/* ─── Profile card ─── */}
      <div className="border border-bone/[0.08] rounded-lg overflow-hidden">
        <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">Identity</span>
          <Link
            href="/profile"
            className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone no-underline"
          >
            edit →
          </Link>
        </div>
        <div className="bg-obsidian p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-bone/20 shrink-0">
            {profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-lime">
                <span className="font-basement text-[22px] text-obsidian">{initial}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-basement text-[clamp(16px,1.5vw,20px)] uppercase truncate text-bone">{displayName}</p>
            {profile?.username && (
              <p className="font-mono text-[11px] text-bone/40 mt-0.5">@{profile.username}</p>
            )}
            {profile?.bio && (
              <p className="font-zirkon text-[12px] text-bone/50 italic mt-1 line-clamp-2">
                &ldquo;{profile.bio.length > 120 ? profile.bio.slice(0, 120) + '…' : profile.bio}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
