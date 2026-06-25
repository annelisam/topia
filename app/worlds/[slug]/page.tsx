'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import PageShell from '../../components/PageShell';
import LoadingScreen from '../../components/LoadingScreen';
import ShareButton from '../../components/ShareButton';
import { getWorldConfig } from '../../components/world/worldConfig';
import OverviewLayer, { type SocialLinks } from '../../components/world/OverviewLayer';
import ProjectsLayer, { type ProjectItem } from '../../components/world/ProjectsLayer';
import TeamLayer, { type WorldMember } from '../../components/world/TeamLayer';
import EventsLayer, { type WorldEvent } from '../../components/world/EventsLayer';
import { useRecordWorldView } from '../../dashboard/_components/RecentlyViewedWorlds';

/* ── Types ────────────────────────────────────────────────────── */

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
  creatorName: string | null;
  creatorSlug: string | null;
  creatorWebsiteUrl: string | null;
  creatorCountry: string | null;
  members: WorldMember[];
}

const SECTIONS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'projects', label: 'PROJECTS' },
  { id: 'team',     label: 'TEAM' },
  { id: 'events',   label: 'EVENTS' },
] as const;
type SectionId = typeof SECTIONS[number]['id'];

/* ── Main Page ────────────────────────────────────────────────── */

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user, authenticated } = usePrivy();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

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
    if (!world?.id) return;
    fetch(`/api/worlds/projects?worldId=${world.id}`)
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(console.error);
    fetch(`/api/events?worldId=${world.id}`)
      .then((r) => r.json())
      .then((data) => setWorldEvents(data.events || []))
      .catch(console.error);
  }, [world?.id]);

  useRecordWorldView(world ? { slug: world.slug, title: world.title, imageUrl: world.imageUrl } : null);

  const config = useMemo(() => getWorldConfig(slug), [slug]);

  const worldBuilders = useMemo(() => world?.members?.filter((m) => m.role === 'world_builder' || m.role === 'owner') || [], [world]);
  const collaboratorMembers = useMemo(() => world?.members?.filter((m) => m.role === 'collaborator') || [], [world]);
  const isWorldBuilder = currentUserId && worldBuilders.some((b) => b.userId === currentUserId);
  const toolsList = world?.tools ? world.tools.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const established = world?.dateAdded
    ? new Date(world.dateAdded).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  // Overview + Projects (with the globe) always show; Team/Events hide when empty.
  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === 'team') return worldBuilders.length + collaboratorMembers.length > 0;
    if (s.id === 'events') return worldEvents.length > 0;
    return true; // overview + projects always
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
      case 'projects': return <ProjectsLayer config={config} projects={projects} slug={slug} />;
      case 'team':     return <TeamLayer config={config} builders={worldBuilders} collaborators={collaboratorMembers} />;
      case 'events':   return <EventsLayer config={config} events={worldEvents} />;
      default:         return <OverviewLayer config={config} description={world?.description ?? null} shortDescription={world?.shortDescription ?? null} tools={toolsList} socialLinks={world?.socialLinks ?? null} />;
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
              <div className="relative z-10 grid grid-cols-1 gap-[3px] border border-ink/[0.08] rounded-lg overflow-hidden">

                {/* ═══ ROW 1 — REGISTRY CARD ═══ */}
                <div className="bg-[var(--page-bg)] relative overflow-hidden">
                  {/* Category-colored accent strip */}
                  <div className={`${config.bg} px-4 py-2 flex items-center justify-between relative`}>
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(26,26,26,0.6) 4px, rgba(26,26,26,0.6) 5px)' }} />
                    <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-70 relative z-10`}>topia://world</span>
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${config.textOn} opacity-55 relative z-10`}>WORLD-{world.id.slice(0, 4).toUpperCase()}</span>
                  </div>

                  {/* Image + Fields */}
                  <div className="flex flex-col md:flex-row relative">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/logo-white.png" alt="" className="w-32 md:w-40 opacity-[0.012] select-none" draggable={false} />
                    </div>

                    {/* World image — compact on mobile, larger photo slot on desktop */}
                    <div className="flex items-center justify-center pt-5 pb-2 px-4 md:p-5 relative z-10 md:w-[28%] shrink-0">
                      <div className="relative">
                        <div className="absolute -top-2 -left-2 w-4 h-4 z-30"><div className="absolute top-0 left-0 w-full h-[1px] bg-ink/15" /><div className="absolute top-0 left-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 z-30"><div className="absolute top-0 right-0 w-full h-[1px] bg-ink/15" /><div className="absolute top-0 right-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 z-30"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-ink/15" /><div className="absolute bottom-0 left-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 z-30"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-ink/15" /><div className="absolute bottom-0 right-0 h-full w-[1px] bg-ink/15" /></div>
                        <div className="w-24 h-24 md:w-44 md:h-44 rounded-lg relative overflow-hidden border border-dashed border-ink/15 p-1.5">
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
                    <div className="flex-1 px-3 py-2 md:px-4 md:py-2.5 flex flex-col justify-center relative z-10">
                      <div className="py-1 border-b border-ink/[0.04]">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">designation</span>
                        <h1 className="font-basement font-black text-[clamp(20px,2.6vw,34px)] leading-[0.9] uppercase text-ink mt-0.5">{world.title}</h1>
                      </div>
                      <div className="py-1 border-b border-ink/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">handle</span>
                          <span className="font-mono text-[13px] text-ink/60 mt-0.5 block">topia://{slug}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">category</span>
                          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 ${config.bg} ${config.textOn} inline-block mt-1`}>{world.category || 'GENERAL'}</span>
                        </div>
                      </div>
                      <div className="py-1 border-b border-ink/[0.04] flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">established</span>
                          <span className="font-mono text-[11px] text-ink/40 mt-0.5 block">{established || '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">status</span>
                          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                            <span className="font-mono text-[11px] text-ink/50">LIVE</span>
                          </div>
                        </div>
                      </div>
                      <div className="py-1 border-b border-ink/[0.04]">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">architect{worldBuilders.length > 1 ? 's' : ''}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {worldBuilders.length > 0 ? (
                            worldBuilders.map((b) => {
                              const chip = (
                                <span className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full border border-ink/[0.08] hover:border-ink/25 transition-colors">
                                  {b.userAvatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={b.userAvatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center font-mono text-[9px] font-bold text-ink">{(b.userName || b.userUsername || '?')[0]?.toUpperCase()}</span>
                                  )}
                                  <span className="font-mono text-[11px] text-ink/60 truncate max-w-[140px]">{b.userName || b.userUsername || 'Unknown'}</span>
                                </span>
                              );
                              return b.userUsername
                                ? <Link key={b.userId} href={`/profile/${b.userUsername}`} className="no-underline">{chip}</Link>
                                : <span key={b.userId}>{chip}</span>;
                            })
                          ) : world.creatorName ? (
                            world.creatorSlug ? (
                              <Link href={`/profile/${world.creatorSlug}`} className="font-mono text-[11px] text-ink/50 no-underline hover:text-ink/80 transition-colors">{world.creatorName}</Link>
                            ) : (
                              <span className="font-mono text-[11px] text-ink/40">{world.creatorName}</span>
                            )
                          ) : (
                            <span className="font-mono text-[11px] text-ink/40">—</span>
                          )}
                        </div>
                      </div>
                      {world.shortDescription && (
                        <div className="py-1 border-b border-ink/[0.04]">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">declaration</span>
                          <span className="font-zirkon text-[11px] text-ink/50 italic mt-0.5 block leading-relaxed line-clamp-2">&ldquo;{world.shortDescription}&rdquo;</span>
                        </div>
                      )}
                      <div className="py-1.5 flex items-center justify-end gap-1.5">
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

                {/* ═══ ROW 2 — STATS BAR ═══ */}
                <div className="bg-[var(--page-bg)] border-t border-b border-ink/[0.04] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-0">
                    {[
                      { label: 'Projects', value: String(projects.length) },
                      { label: 'Members', value: String(world.members?.length || 0) },
                      { label: 'Events', value: String(worldEvents.length) },
                      { label: 'Collabs', value: String(collaboratorMembers.length) },
                    ].map((stat, i, arr) => (
                      <div key={stat.label} className={`flex flex-col px-3 md:px-5 ${i < arr.length - 1 ? 'border-r border-ink/[0.06]' : ''} ${i === 0 ? 'pl-0' : ''}`}>
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[2px] text-ink/20">{stat.label}</span>
                        <span className="font-mono text-[15px] text-ink font-bold leading-none mt-0.5">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    <div className="w-32 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${config.hex}30, ${config.hex}60, ${config.hex}30, transparent)` }} />
                    <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/15">topia://stats</span>
                  </div>
                </div>

                {/* ═══ ROW 3 — SECTION TAB NAV ═══ */}
                <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
                  <span className="font-mono text-[9px] text-ink/15 ml-auto shrink-0">{visibleSections.length} sections</span>
                </div>

                {/* ═══ ROW 4 — ACTIVE SECTION ═══ */}
                <div className="bg-[var(--page-bg)] min-h-[280px]">
                  {renderSection()}
                </div>

                {/* ═══ ROW 5 — MRZ STRIP ═══ */}
                <div className="bg-[var(--page-bg)] px-4 py-3 flex items-center justify-between border-t border-ink/[0.04]">
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-end gap-0 h-4">
                      {bars.map((b, i) => (
                        <div key={i} className={b.type === 'bar' ? 'bg-ink/10' : ''} style={{ width: `${b.w}px`, height: b.type === 'bar' ? `${12 + (b.w * 2)}px` : '0px', marginRight: b.type === 'gap' ? `${b.w}px` : '0px' }} />
                      ))}
                    </div>
                    <span className="font-mono text-[9px] tracking-[2px] text-ink/15 uppercase truncate block">{mrzLine1}</span>
                    <span className="font-mono text-[9px] tracking-[2px] text-ink/10 uppercase truncate block">{mrzLine2}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="font-mono text-[9px] text-ink/10 hidden md:block">{world.id.slice(0, 6)}···{world.id.slice(-4)}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-white.png" alt="" className="w-4 h-4 opacity-20" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="font-mono text-[8px] text-ink/10 uppercase">W1</span>
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
