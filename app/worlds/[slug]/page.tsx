'use client';

import { useState, useEffect, use, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import ShareButton from '../../components/ShareButton';
import { SocialIcon } from '../../components/SocialIcons';
import { getWorldConfig } from '../../components/world/worldConfig';
import OverviewLayer, { type SocialLinks, type ActivityItem } from '../../components/world/OverviewLayer';
import ProjectsLayer, { type ProjectItem } from '../../components/world/ProjectsLayer';
import EventsLayer, { type WorldEvent } from '../../components/world/EventsLayer';
import ToolsLayer from '../../components/world/ToolsLayer';
import ArchitectsLayer from '../../components/world/ArchitectsLayer';
import { type ToolMiniData } from '../../resources/tools/ToolMiniCard';
import { useRecordWorldView } from '../../dashboard/_components/RecentlyViewedWorlds';

/* ── Types ────────────────────────────────────────────────────── */

interface WorldMember {
  userId: string;
  role: string;
  userName: string | null;
  userUsername: string | null;
  userAvatarUrl: string | null;
  createdAt?: string;
}

interface Announcement {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorUsername: string | null;
}

interface WorldDetail {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  headerImageUrl: string | null;
  country: string | null;
  tools: string | null;
  collaborators: string | null;
  socialLinks: SocialLinks | null;
  dateAdded: string | null;
  createdAt: string;
  creatorName: string | null;
  creatorSlug: string | null;
  creatorWebsiteUrl: string | null;
  creatorCountry: string | null;
  members: WorldMember[];
}

const SECTIONS = [
  { id: 'overview',   label: 'OVERVIEW' },
  { id: 'projects',   label: 'PROJECTS' },
  { id: 'architects', label: 'ARCHITECTS' },
  { id: 'events',     label: 'EVENTS' },
  { id: 'tools',      label: 'TOOLS' },
] as const;
type SectionId = typeof SECTIONS[number]['id'];

/* ── Main Page ────────────────────────────────────────────────── */

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allTools, setAllTools] = useState<ToolMiniData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, authenticated } = usePrivy();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  // Desktop-only adjustable split: the dossier rail's width, dragged via the
  // divider gutter, clamped and remembered per person. Mobile never drags —
  // the rail simply stacks above the content there.
  const RAIL_MIN = 280, RAIL_MAX = 480, RAIL_DEFAULT = 340;
  const [railW, setRailW] = useState(RAIL_DEFAULT);
  const railWRef = useRef(RAIL_DEFAULT);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  useEffect(() => {
    const saved = Number(localStorage.getItem('topia:world-rail-w'));
    if (saved >= RAIL_MIN && saved <= RAIL_MAX) { setRailW(saved); railWRef.current = saved; }
  }, []);
  const onDividerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startW: railWRef.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onDividerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const w = Math.min(RAIL_MAX, Math.max(RAIL_MIN, dragRef.current.startW + (e.clientX - dragRef.current.startX)));
    railWRef.current = w;
    setRailW(w);
  }, []);
  const onDividerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try { localStorage.setItem('topia:world-rail-w', String(railWRef.current)); } catch {}
  }, []);
  const onDividerReset = useCallback(() => {
    railWRef.current = RAIL_DEFAULT;
    setRailW(RAIL_DEFAULT);
    try { localStorage.setItem('topia:world-rail-w', String(RAIL_DEFAULT)); } catch {}
  }, []);

  useEffect(() => {
    const worldPromise = fetch(`/api/worlds?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => { if (data.worlds && data.worlds.length > 0) setWorld(data.worlds[0]); });

    const userPromise = (authenticated && user?.id)
      ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
          .then((r) => r.json())
          .then((d) => { if (d.user) setCurrentUserId(d.user.id); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([worldPromise, userPromise]).catch(console.error).finally(() => setLoading(false));
  }, [slug, authenticated, user?.id]);

  useEffect(() => {
    fetch('/api/tools')
      .then((r) => r.json())
      .then((data) => setAllTools(data.tools || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!world?.id) return;
    fetch(`/api/worlds/projects?worldId=${world.id}`)
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(console.error);
    fetch(`/api/events?worldId=${world.id}`)
      .then((r) => r.json())
      .then((data) => setWorldEvents(data.events || []))
      .catch(console.error);
    fetch(`/api/worlds/announcements?worldId=${world.id}`)
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(console.error);
  }, [world?.id]);

  useEffect(() => {
    if (!world?.id) return;
    const qs = new URLSearchParams({ worldId: world.id });
    if (user?.id) qs.set('privyId', user.id);
    fetch(`/api/worlds/follow?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setFollowers(typeof d.followers === 'number' ? d.followers : 0);
        setFollowing(Boolean(d.following));
      })
      .catch(console.error);
  }, [world?.id, user?.id]);

  useRecordWorldView(world ? { slug: world.slug, title: world.title, imageUrl: world.imageUrl } : null);

  const config = useMemo(() => getWorldConfig(slug), [slug]);

  const worldBuilders = useMemo(() => world?.members?.filter((m) => m.role === 'world_builder' || m.role === 'owner') || [], [world]);
  const collaboratorMembers = useMemo(() => world?.members?.filter((m) => m.role === 'collaborator') || [], [world]);
  const isWorldBuilder = currentUserId && worldBuilders.some((b) => b.userId === currentUserId);
  const isMember = currentUserId && (world?.members ?? []).some((m) => m.userId === currentUserId);
  const hasSocial = world?.socialLinks && Object.values(world.socialLinks).some((v) => v);

  async function toggleWorldFollow() {
    if (!world || !user?.id || followPending) return;
    const wasFollowing = following;
    setFollowPending(true);
    // optimistic
    setFollowing(!wasFollowing);
    setFollowers((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
    try {
      const res = await fetch('/api/worlds/follow', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, worldId: world.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch (err) {
      console.error('[world] follow toggle failed:', err);
      setFollowing(wasFollowing);
      setFollowers((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
    } finally {
      setFollowPending(false);
    }
  }

  // Tools come from two places: the world's own `tools` field, and any
  // `tool:` tags builders attached to individual projects — merged so a tool
  // used on a project shows up here too, case-insensitively deduped.
  const toolsList = useMemo(() => {
    const worldToolNames = world?.tools ? world.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const projectToolNames = projects.flatMap((p) => (p.tags || []).filter((t) => t.startsWith('tool:')).map((t) => t.replace('tool:', '')));
    const seen = new Map<string, string>();
    for (const name of [...worldToolNames, ...projectToolNames]) {
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }
    return Array.from(seen.values());
  }, [world?.tools, projects]);

  // Events get their own "Latest events" section in Overview, so they're
  // deliberately left out of this log — otherwise every event shows up twice.
  const activity: ActivityItem[] = useMemo(() => {
    if (!world) return [];
    const items: ActivityItem[] = [
      { id: `published-${world.id}`, type: 'published', primaryText: `${world.title} went live`, timestamp: new Date(world.createdAt) },
    ];

    // Batch-seeded crews (e.g. at world creation) join within the same day —
    // group same-day joins into one line instead of one row per person.
    const byDay = new Map<string, { userName: string | null; userUsername: string | null; userAvatarUrl: string | null; role: string; timestamp: Date }[]>();
    for (const m of world.members) {
      if (!m.createdAt) continue;
      const timestamp = new Date(m.createdAt);
      const key = timestamp.toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push({ userName: m.userName, userUsername: m.userUsername, userAvatarUrl: m.userAvatarUrl, role: m.role, timestamp });
    }
    for (const group of byDay.values()) {
      const latest = group.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
      if (group.length === 1) {
        const m = group[0];
        items.push({
          id: `member-${m.userUsername || m.userName}-${m.timestamp.getTime()}`,
          type: 'member',
          primaryText: `${m.userName || m.userUsername || 'Someone'} joined as ${m.role.replace('_', ' ')}`,
          timestamp: m.timestamp,
          avatarUrls: [m.userAvatarUrl],
        });
      } else {
        items.push({
          id: `member-group-${latest.timestamp.getTime()}`,
          type: 'member',
          primaryText: `${group.length} people joined the world`,
          timestamp: latest.timestamp,
          avatarUrls: group.slice(0, 5).map((g) => g.userAvatarUrl),
        });
      }
    }

    for (const p of projects) {
      if (!p.createdAt) continue;
      items.push({ id: `project-${p.id}`, type: 'project', primaryText: `Project added — ${p.name}`, timestamp: new Date(p.createdAt) });
    }

    for (const a of announcements) {
      const who = a.authorName || a.authorUsername || 'Someone';
      items.push({ id: `announcement-${a.id}`, type: 'announcement', primaryText: `${who}: ${a.body}`, timestamp: new Date(a.createdAt) });
    }

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
  }, [world, projects, announcements]);

  async function handlePostUpdate(body: string) {
    if (!world || !user?.id) return;
    const res = await fetch('/api/worlds/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldId: world.id, privyId: user.id, body }),
    });
    const data = await res.json();
    if (data.announcement) setAnnouncements((prev) => [data.announcement, ...prev]);
  }

  const established = world?.dateAdded
    ? new Date(world.dateAdded).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  // Overview + Projects + Architects + Tools always show; Events hides when empty.
  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === 'events') return worldEvents.length > 0;
    return true; // overview + projects + architects + tools always
  });

  // Barcode + machine-readable zone, keyed off the world.
  const bars = (slug || 'TOPIA').split('').flatMap((ch, i) => {
    const code = ch.charCodeAt(0);
    return [
      { type: 'bar' as const, w: ((code * (i + 1)) % 4) + 1 },
      { type: 'gap' as const, w: ((code + i) % 3) + 1 },
    ];
  });
  const mrzLine1 = `W<TOPIA<${(world?.title || slug || '').replace(/[.\s]/g, '<').toUpperCase().padEnd(20, '<')}<<<<<<<<<`;
  const mrzLine2 = `${(world?.id || '').slice(0, 10).padEnd(10, '<')}<<${(established || '').replace(/\s/g, '').padEnd(6, '<')}<<${(world?.category || 'GEN').substring(0, 3).toUpperCase()}<${(slug || '').padEnd(14, '<')}<<`;

  function renderSection() {
    switch (activeSection) {
      case 'projects':   return <ProjectsLayer config={config} projects={projects} slug={slug} />;
      case 'architects': return <ArchitectsLayer config={config} builders={worldBuilders} collaborators={collaboratorMembers} />;
      case 'events':     return <EventsLayer config={config} events={worldEvents} />;
      case 'tools':      return <ToolsLayer config={config} toolNames={toolsList} allTools={allTools} canEdit={!!isWorldBuilder} editHref={`/dashboard/worlds/${slug}/details`} />;
      default:
        return (
          <OverviewLayer
            config={config}
            description={world?.description ?? null}
            shortDescription={world?.shortDescription ?? null}
            events={worldEvents}
            onViewEvents={() => setActiveSection('events')}
            activity={activity}
            canPostUpdate={!!isWorldBuilder}
            onPostUpdate={handlePostUpdate}
          />
        );
    }
  }

  if (!loading && !world) {
    return (
      <PageShell>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--page-bg)]">
          <p className="font-mono text-[13px] mb-4 text-ink">World not found.</p>
          <Link href="/worlds" className="font-mono text-[13px] underline text-ink">← Back to Worlds</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <LoadingScreen onComplete={() => setIsLoaded(true)} />
      <PageShell>
        <section className={`min-h-screen px-4 md:px-6 py-4 md:py-6 transition-opacity duration-500 ${isLoaded && !loading ? 'opacity-100' : 'opacity-0'}`}>
          <div className="max-w-[var(--content-max)] mx-auto">
            {world && (
              <div
                className="relative z-10 max-w-[1320px] mx-auto flex flex-col gap-[3px] border border-ink/[0.08] rounded-lg overflow-visible md:overflow-hidden md:grid md:grid-cols-[var(--rail-w)_7px_minmax(0,1fr)] md:grid-rows-[auto_1fr_auto] md:items-stretch"
                style={{ '--rail-w': `${railW}px` } as React.CSSProperties}
              >

                {/* ═══ RAIL — the dossier (stacks above content on mobile;
                    a fixed-width left column with a drag handle on desktop) ═══ */}
                <div className="bg-[var(--page-bg)] relative overflow-hidden rounded-t-lg md:rounded-none md:row-span-2">
                  {/* Category-colored accent strip */}
                  <div className={`${config.bg} px-4 py-2 flex items-center justify-between relative`}>
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px)' }} />
                    <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-70 relative z-10`}>topia://world</span>
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${config.textOn} opacity-55 relative z-10`}>WORLD-{world.id.slice(0, 4).toUpperCase()}</span>
                  </div>

                  {/* Image + Fields — stacked (the rail is a column on desktop too) */}
                  <div className="flex flex-col relative">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/logo-white.png" alt="" className="w-32 md:w-40 opacity-[0.012] select-none" draggable={false} />
                    </div>

                    {/* World image */}
                    <div className="flex items-center justify-center pt-5 pb-2 px-4 relative z-10 shrink-0">
                      <div className="relative">
                        <div className="absolute -top-2 -left-2 w-4 h-4 z-30"><div className="absolute top-0 left-0 w-full h-[1px] bg-ink/15" /><div className="absolute top-0 left-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 z-30"><div className="absolute top-0 right-0 w-full h-[1px] bg-ink/15" /><div className="absolute top-0 right-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 z-30"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-ink/15" /><div className="absolute bottom-0 left-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 z-30"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-ink/15" /><div className="absolute bottom-0 right-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg relative overflow-hidden border border-dashed border-ink/15 p-1.5">
                          <div className="w-full h-full rounded-md relative overflow-hidden border-2 border-ink/20">
                            {world.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={world.imageUrl} alt={world.title} className="w-full h-full object-cover relative z-10" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-ink/5 p-3">
                                <span className="font-basement font-black text-[clamp(22px,5vw,36px)] text-ink/20 text-center uppercase leading-none">{world.title}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 pointer-events-none z-20" style={{ opacity: 0.1, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)', backgroundSize: '100% 2px' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Registry fields */}
                    <div className="flex-1 px-4 py-2 md:py-3 flex flex-col justify-center relative z-10 min-w-0">
                      <div className="py-1.5 border-b border-ink/[0.04]">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">designation</span>
                        <h1 className="font-basement font-black text-[clamp(24px,3vw,40px)] leading-[0.9] uppercase text-ink mt-0.5">{world.title}</h1>
                      </div>

                      <div className="py-2 border-b border-ink/[0.04] flex flex-wrap gap-x-10 gap-y-3">
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">handle</span>
                          <span className="font-mono text-[13px] text-ink/60 mt-0.5 block truncate">topia://{slug}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">category</span>
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${config.bg} ${config.textOn} inline-block mt-1`}>{world.category || 'GENERAL'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">established</span>
                          <span className="font-mono text-[11px] text-ink/40 mt-0.5 block">{established || '—'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">status</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                            <span className="font-mono text-[11px] text-ink/50">LIVE</span>
                          </div>
                        </div>
                      </div>

                      <div className="py-2 border-b border-ink/[0.04]">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block mb-1.5">connect</span>
                        {hasSocial ? (
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(world.socialLinks || {}).map(([key, url]) =>
                              url ? (
                                <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-ink/40 hover:text-ink/70 transition-colors" title={key}>
                                  <SocialIcon type={key} size={16} />
                                </a>
                              ) : null,
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-ink/30">—</span>
                        )}
                      </div>

                      <div className="py-2 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                        {world.shortDescription ? (
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">declaration</span>
                            <span className="font-zirkon text-[11px] text-ink/50 italic mt-0.5 block leading-relaxed line-clamp-2">&ldquo;{world.shortDescription}&rdquo;</span>
                          </div>
                        ) : <div />}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {authenticated && !isMember && (
                            <button
                              onClick={toggleWorldFollow}
                              disabled={followPending}
                              className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider rounded-sm px-2 py-0.5 cursor-pointer transition-colors border ${
                                following
                                  ? 'bg-ink text-[var(--page-bg)] border-ink'
                                  : 'bg-transparent border-ink/[0.08] text-ink/50 hover:text-ink/60'
                              }`}
                            >
                              {followPending ? '…' : following ? 'Following' : '+ Follow'}
                            </button>
                          )}
                          {followers > 0 && (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                              {followers} follower{followers !== 1 ? 's' : ''}
                            </span>
                          )}
                          <ShareButton
                            kind="world"
                            title={world.title}
                            text={`${world.title} — a world on TOPIA`}
                            iconSize={11}
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/60 transition-colors border border-ink/[0.08] rounded-sm px-2 py-0.5 cursor-pointer bg-transparent"
                          />
                          {isWorldBuilder && (
                            <Link href={`/dashboard/worlds/${world.slug}`} className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/60 transition-colors border border-ink/[0.08] rounded-sm px-2 py-0.5 no-underline">
                              Manage
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══ DIVIDER — desktop-only drag handle for the split ═══ */}
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize panel (double-click to reset)"
                  onPointerDown={onDividerDown}
                  onPointerMove={onDividerMove}
                  onPointerUp={onDividerUp}
                  onDoubleClick={onDividerReset}
                  className="hidden md:flex md:row-span-2 items-center justify-center cursor-col-resize select-none touch-none group"
                >
                  <div className="w-[3px] h-12 rounded-full bg-ink/15 group-hover:bg-ink/40 group-active:bg-ink/60 transition-colors" />
                </div>

                {/* ═══ SECTION TAB NAV — sticky on mobile so sections stay reachable ═══ */}
                <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center gap-1 overflow-x-auto sticky top-0 z-20 md:static" style={{ scrollbarWidth: 'none' }}>
                  {visibleSections.map((s) => {
                    const isActive = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 transition-all rounded-sm whitespace-nowrap cursor-pointer ${isActive ? `${config.bg} ${config.textOn} font-bold` : 'text-ink/50 hover:text-ink/70 bg-transparent'}`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <span className="font-mono text-[9px] text-[var(--text-muted)] ml-auto shrink-0">{visibleSections.length} sections</span>
                </div>

                {/* ═══ ACTIVE SECTION ═══ */}
                <div className="bg-[var(--page-bg)] min-h-[280px]">
                  {renderSection()}
                </div>

                {/* ═══ MRZ STRIP ═══ */}
                <div className="bg-[var(--page-bg)] px-4 py-3 flex items-center justify-between border-t border-ink/[0.04] rounded-b-lg md:rounded-none md:col-span-3">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-end gap-0 h-4">
                      {bars.map((b, i) => (
                        <div key={i} className={b.type === 'bar' ? 'bg-ink/10' : ''} style={{ width: `${b.w}px`, height: b.type === 'bar' ? `${12 + (b.w * 2)}px` : '0px', marginRight: b.type === 'gap' ? `${b.w}px` : '0px' }} />
                      ))}
                    </div>
                    <span className="font-mono text-[9px] tracking-[2px] text-ink/15 uppercase truncate block deco-text" data-deco={mrzLine1} />
                    <span className="font-mono text-[9px] tracking-[2px] text-ink/10 uppercase truncate block deco-text" data-deco={mrzLine2} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="font-mono text-[9px] text-ink/10 hidden md:block deco-text" data-deco={`${world.id.slice(0, 6)}···${world.id.slice(-4)}`} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-white.png" alt="" className="w-4 h-4 opacity-20" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="font-mono text-[8px] text-ink/10 uppercase deco-text" data-deco="W1" />
                  </div>
                </div>

              </div>
            )}

            {/* Back link */}
            <div className="mt-4">
              <Link href="/worlds" className="font-mono text-[12px] uppercase tracking-wider text-ink/40 hover:text-ink/70 transition-colors no-underline">
                ← back to worlds
              </Link>
            </div>
          </div>
        </section>
      </PageShell>
    </div>
  );
}
