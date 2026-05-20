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
    <span className="font-mono text-[9px] uppercase tracking-[2px] text-lime/80 ml-1.5">+{n}</span>
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
  const firstName = displayName.split(' ')[0];

  return (
    <div>
      {/* ═══ HERO: greeting · identity · date · stats — one unified band ═══ */}
      <div className="border border-bone/[0.08] rounded-lg overflow-hidden mb-6">
        {/* Lime band */}
        <div className="bg-lime px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-obsidian/30 shrink-0">
              {profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-obsidian">
                  <span className="font-basement text-[20px] text-lime">{initial}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/50 block">topia://dashboard</span>
              <h1 className="font-basement font-black text-[clamp(22px,3.5vw,36px)] uppercase leading-[0.9] text-obsidian mt-0.5 truncate">
                Hello, {firstName}.
              </h1>
              {profile?.username && (
                <span className="font-mono text-[11px] text-obsidian/70 mt-0.5 block truncate">@{profile.username}</span>
              )}
            </div>
          </div>
          <div className="text-left md:text-right shrink-0">
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

        {/* Stats strip + quick actions */}
        <div className="bg-obsidian border-t border-bone/[0.04] flex flex-col lg:flex-row lg:items-stretch lg:divide-x divide-bone/[0.06]">
          {/* Stats */}
          <div className="px-5 py-3 flex items-center gap-0 overflow-x-auto lg:flex-1">
            {([
              { label: 'Worlds',    value: worldMemberships.length, delta: stats?.deltas.worlds,    href: '/worlds' },
              { label: 'Events',    value: hostedEvents.length,      delta: stats?.deltas.events,    href: '/events' },
              { label: 'Builder',   value: builderCount,             delta: undefined,                href: null },
              { label: 'Followers', value: stats?.followers ?? 0,    delta: stats?.deltas.followers, href: profile?.username ? `/profile/${profile.username}` : null },
              { label: 'Following', value: stats?.following ?? 0,    delta: undefined,                href: null },
            ] satisfies { label: string; value: number; delta?: number; href: string | null }[]).map((stat, i, arr) => {
              const inner = (
                <div className={`flex flex-col px-3 md:px-4 ${i < arr.length - 1 ? 'border-r border-bone/[0.06]' : ''} ${i === 0 ? 'pl-0' : ''}`}>
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

          {/* Quick actions in the same band — primary CTA + secondaries */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-2 lg:shrink-0">
            <Link
              href="/dashboard/create-world"
              className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-3 py-1.5 rounded-sm hover:opacity-90 transition no-underline"
            >
              + World
            </Link>
            <Link
              href="/dashboard/create-event"
              className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/15 hover:border-lime/50 hover:text-bone px-3 py-1.5 rounded-sm transition no-underline"
            >
              + Event
            </Link>
            <Link
              href="/dashboard/submit-tool"
              className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/15 hover:border-lime/50 hover:text-bone px-3 py-1.5 rounded-sm transition no-underline"
            >
              + Tool
            </Link>
            <Link
              href="/dashboard/submit-grant"
              className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/15 hover:border-lime/50 hover:text-bone px-3 py-1.5 rounded-sm transition no-underline"
            >
              + Grant
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ URGENT: invitations + profile completion (full width, top priority) ═══ */}
      <PendingInvitationsWidget />
      <ProfileCompletionWidget />

      {/* ═══ TWO COLUMNS: primary content (2/3) + ambient context (1/3) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <UpcomingEventsWidget />

          {worldMemberships.length > 0 ? (
            <YourWorldsSection worldMemberships={worldMemberships} />
          ) : (
            <EmptyWorldsCard />
          )}

          <SavedToolsWidget />
        </div>

        {/* SIDE COLUMN — ambient / passive context */}
        <aside className="space-y-6 min-w-0">
          <ActivityFeedWidget />
          <RecentlyViewedWorldsWidget />
        </aside>
      </div>
    </div>
  );
}

/* ── Sub-components extracted for readability ─────────────────── */

interface WorldMembership {
  worldId: string;
  worldTitle: string;
  worldSlug: string;
  worldCategory: string | null;
  worldImageUrl: string | null;
  role: string;
}

function YourWorldsSection({ worldMemberships }: { worldMemberships: WorldMembership[] }) {
  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">
          Your worlds · {worldMemberships.length}
        </span>
        <Link href="/worlds" className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone no-underline">
          browse all →
        </Link>
      </div>
      <div className="divide-y divide-bone/[0.04]">
        {worldMemberships.slice(0, 6).map((w) => (
          <Link
            key={w.worldId}
            href={`/dashboard/worlds/${w.worldSlug}`}
            className="bg-obsidian hover:bg-bone/[0.03] transition px-4 py-2.5 flex items-center gap-3 no-underline"
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
  );
}

function EmptyWorldsCard() {
  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">Your worlds</span>
      </div>
      <div className="bg-obsidian p-6 text-center">
        <p className="font-basement font-black text-[24px] uppercase text-bone leading-tight">No worlds yet.</p>
        <p className="font-mono text-[12px] text-bone/50 mt-2 max-w-xs mx-auto">
          A world is your scene — a place creators rally around. Start one, or join one you love.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          <Link
            href="/dashboard/create-world"
            className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm hover:opacity-90 transition no-underline"
          >
            + Create a world
          </Link>
          <Link
            href="/worlds"
            className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/20 hover:border-bone/60 hover:text-bone px-4 py-2 rounded-sm transition no-underline"
          >
            Explore worlds
          </Link>
        </div>
      </div>
    </div>
  );
}
