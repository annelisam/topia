'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageShell from '../../components/PageShell';
import LoadingBar from '../../components/LoadingBar';
import WorldGlobe from '../../components/WorldGlobe';
import { SocialIcon } from '../../components/SocialIcons';
import ProjectContent from '../../components/ProjectContent';
import { markdownComponents } from '../../components/ProjectContent';

/* ── Types ────────────────────────────────────────────────────── */

interface WorldMember {
  userId: string;
  role: string;
  userName: string | null;
  userUsername: string | null;
  userAvatarUrl: string | null;
}

interface SocialLinks {
  website?: string;
  twitter?: string;
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  linkedin?: string;
  substack?: string;
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
  creatorName: string | null;
  creatorSlug: string | null;
  creatorWebsiteUrl: string | null;
  creatorCountry: string | null;
  members: WorldMember[];
}

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  url?: string | null;
  links?: { label: string; url: string }[] | null;
  tags?: string[] | null;
}

interface WorldEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
}

const COLOR_DOT: Record<string, string> = { lime: 'bg-lime', blue: 'bg-blue', pink: 'bg-pink', orange: 'bg-orange', green: 'bg-green' };
const COLOR_TXT: Record<string, string> = { lime: 'text-lime', blue: 'text-blue', pink: 'text-pink', orange: 'text-orange', green: 'text-green' };

/* ── Project Detail Slide Panel ───────────────────────────────── */

function ProjectPanel({
  project,
  onClose,
  onExpand,
}: {
  project: ProjectItem;
  onClose: () => void;
  onExpand: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const hiddenTransform = isDesktop ? 'translateX(100%)' : 'translateY(100%)';

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', opacity: visible ? 1 : 0, transition: 'opacity 300ms ease-out' }}
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        className="fixed z-50 overflow-y-auto bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl sm:rounded-t-none sm:bottom-auto sm:left-auto sm:top-0 sm:right-0 sm:h-full sm:w-[560px] lg:w-[640px] sm:max-w-[55vw] sm:max-h-none sm:pt-16"
        style={{ backgroundColor: 'var(--background)', borderLeft: '1px solid var(--border-color)', transform: visible ? 'translate(0, 0)' : hiddenTransform, transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--foreground)', opacity: 0.15 }} />
        </div>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="font-mono text-[13px] font-bold uppercase truncate pr-4" style={{ color: 'var(--foreground)' }}>{project.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onExpand} className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-60" style={{ color: 'var(--foreground)' }} title="Open full page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-60 font-mono text-[18px]" style={{ color: 'var(--foreground)' }}>×</button>
          </div>
        </div>
        <div className="p-5 sm:p-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out 100ms, transform 250ms ease-out 100ms' }}>
          <ProjectContent project={project} maxImageHeight="250px" />
        </div>
      </div>
    </>
  );
}

/* ── Member Card ──────────────────────────────────────────────── */

function MemberCard({ member }: { member: WorldMember }) {
  const inner = (
    <div className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg transition-colors hover:bg-bone/[0.04]">
      {member.userAvatarUrl ? (
        <img src={member.userAvatarUrl} alt={member.userName || ''} className="w-8 h-8 rounded-full object-cover border border-bone/10" />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold bg-bone/10 text-bone">
          {(member.userName || member.userUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-mono text-[12px] font-bold leading-tight text-bone">{member.userName || member.userUsername || 'Unknown'}</p>
        {member.userUsername && <p className="font-mono text-[10px] text-bone/40 leading-tight">@{member.userUsername}</p>}
      </div>
    </div>
  );
  if (member.userUsername) return <Link href={`/profile/${member.userUsername}`} className="block">{inner}</Link>;
  return <div>{inner}</div>;
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { user, authenticated } = usePrivy();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const worldPromise = fetch(`/api/worlds?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => { if (data.worlds && data.worlds.length > 0) setWorld(data.worlds[0]); });

    const userPromise = (authenticated && user?.id)
      ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
          .then(r => r.json())
          .then(d => { if (d.user) setCurrentUserId(d.user.id); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([worldPromise, userPromise]).catch(console.error).finally(() => setLoading(false));
  }, [slug, authenticated, user?.id]);

  useEffect(() => {
    if (!world?.id) return;
    fetch(`/api/worlds/projects?worldId=${world.id}`)
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error);
    fetch(`/api/events?worldId=${world.id}`)
      .then(r => r.json())
      .then(data => setWorldEvents(data.events || []))
      .catch(console.error);
  }, [world?.id]);

  const handleSelectProject = useCallback((proj: { id: string; name: string; slug: string } | null) => {
    if (!proj) { setSelectedProject(null); return; }
    const full = projects.find(p => p.id === proj.id);
    setSelectedProject(full || proj as ProjectItem);
  }, [projects]);

  if (loading) {
    return <PageShell><div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}><LoadingBar /></div></PageShell>;
  }

  if (!world) {
    return (
      <PageShell>
        <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--page-bg)' }}>
          <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>World not found.</p>
          <Link href="/worlds" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Worlds</Link>
        </div>
      </PageShell>
    );
  }

  const worldBuilders = world.members?.filter(m => m.role === 'world_builder' || m.role === 'owner') || [];
  const collaboratorMembers = world.members?.filter(m => m.role === 'collaborator') || [];
  const isWorldBuilder = currentUserId && worldBuilders.some(b => b.userId === currentUserId);
  const socialLinks = world.socialLinks as SocialLinks | null;
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v);
  const toolsList = world.tools ? world.tools.split(',').map(t => t.trim()).filter(Boolean) : [];
  const color = 'lime';
  const activeProj = projects.find(p => p.slug === activeProject);

  return (
    <PageShell>
      <section className="min-h-screen px-4 md:px-6 py-4 md:py-6" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="grid grid-rows-[auto_auto_minmax(300px,50vh)_auto] grid-cols-1 md:grid-cols-[1fr_1fr] gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden">

            {/* ROW 1 — Header */}
            <div className="p-5 md:p-6 flex flex-col justify-between transition-colors duration-300" style={{ backgroundColor: 'var(--accent, #e4fe52)' }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[7px] uppercase tracking-[2px]" style={{ color: 'var(--accent-text, #1a1a1a)', opacity: 0.5 }}>worlds // {slug}</span>
                {isWorldBuilder && (
                  <Link href={`/dashboard/worlds/${world.slug}`} className="font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-sm transition hover:opacity-70" style={{ backgroundColor: 'var(--accent-text)', color: 'var(--accent)' }}>
                    Manage
                  </Link>
                )}
              </div>
              <h1 className="font-basement font-black text-[clamp(24px,4vw,48px)] leading-[0.85] uppercase mt-2" style={{ color: 'var(--accent-text, #1a1a1a)' }}>
                {world.title}
              </h1>
            </div>

            {/* Stats grid */}
            <div className="bg-obsidian grid grid-cols-2 grid-rows-2 gap-[1px]">
              <div className="p-3 border-b border-r border-bone/[0.06]">
                <span className="font-basement font-black text-[24px] text-bone leading-none block">{projects.length}</span>
                <span className="font-mono text-[7px] text-bone uppercase tracking-wider">projects</span>
              </div>
              <div className="p-3 border-b border-bone/[0.06]">
                <span className="font-basement font-black text-[24px] text-bone leading-none block">{world.members?.length || 0}</span>
                <span className="font-mono text-[7px] text-bone uppercase tracking-wider">members</span>
              </div>
              <div className="p-3 border-r border-bone/[0.06]">
                <span className="font-basement font-black text-[24px] text-bone leading-none block">{worldEvents.length}</span>
                <span className="font-mono text-[7px] text-bone uppercase tracking-wider">events</span>
              </div>
              <div className="p-3">
                {world.category ? (
                  <>
                    <span className="font-basement font-black text-[16px] text-bone leading-none block uppercase">{world.category}</span>
                    <span className="font-mono text-[7px] text-bone uppercase tracking-wider">category</span>
                  </>
                ) : (
                  <>
                    <span className="font-basement font-black text-[24px] text-bone leading-none block">—</span>
                    <span className="font-mono text-[7px] text-bone uppercase tracking-wider">category</span>
                  </>
                )}
              </div>
            </div>

            {/* ROW 2 — Nav bar */}
            <div className="md:col-span-2 bg-obsidian border-t border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-bone tracking-wider">
                {activeProj ? (
                  <><span className="text-bone/50">project:</span> <span className={`font-bold ${COLOR_TXT[color]}`}>{activeProj.name}</span></>
                ) : <span className="text-bone/40">hover a project to preview</span>}
              </span>
              <div className="flex items-center gap-2">
                {projects.map(p => (
                  <div key={p.id} className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[color]} ${activeProject === p.slug ? 'scale-[2]' : 'opacity-40'} transition-all`} />
                ))}
              </div>
            </div>

            {/* ROW 3 — Globe */}
            <div className="md:col-span-2 bg-obsidian relative overflow-hidden min-h-[300px]" style={{ height: 'max(40vh, 300px)' }}>
              <WorldGlobe
                projects={projects}
                onSelectProject={handleSelectProject}
                selectedProjectSlug={selectedProject?.slug || null}
              />
              <div className="absolute bottom-3 left-4 z-10">
                <span className="font-mono text-[7px] uppercase tracking-wider text-bone/40">topia://{slug}</span>
              </div>
            </div>

            {/* ROW 4 — Project index + Preview */}
            {/* Left: Project ledger index */}
            <div className="relative bg-obsidian overflow-y-auto min-h-[200px]" style={{ scrollbarWidth: 'thin', maxHeight: '400px' }}>
              {/* Crosshatch */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }}
              />
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }}
              />
              <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />

              <div className="relative z-10">
                {projects.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="font-mono text-[10px] text-bone/30 uppercase tracking-wider">No projects yet</span>
                  </div>
                ) : projects.map((proj, i) => {
                  const isActive = activeProject === proj.slug;
                  const isSelected = selectedProject?.slug === proj.slug;
                  return (
                    <div
                      key={proj.id}
                      className={`flex items-center cursor-pointer transition-all duration-150 border-b border-bone/[0.04] ${isSelected ? 'bg-bone/[0.06]' : isActive ? 'bg-bone/[0.04]' : 'hover:bg-bone/[0.02]'}`}
                      style={{ minHeight: '48px' }}
                      onMouseEnter={() => setActiveProject(proj.slug)}
                      onMouseLeave={() => setActiveProject(null)}
                      onClick={() => handleSelectProject(selectedProject?.slug === proj.slug ? null : proj)}
                    >
                      <div className="w-[28px] shrink-0 flex items-center justify-center">
                        <span className="font-mono text-[7px] text-bone/15">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div className={`w-[2px] shrink-0 self-stretch ${COLOR_DOT[color]}`} />
                      <div className="flex-1 flex items-center justify-between px-3 py-2.5 min-w-0">
                        <div className="min-w-0">
                          <span className={`font-mono text-[10px] uppercase font-bold ${isSelected || isActive ? COLOR_TXT[color] : 'text-bone/50'} transition-colors truncate block`}>{proj.name}</span>
                          {proj.tags && proj.tags.length > 0 && <span className="font-mono text-[7px] text-bone/30">{proj.tags[0]}</span>}
                        </div>
                        {isSelected && (
                          <span className="font-mono text-[6px] uppercase tracking-wider text-bone/25 border border-bone/[0.08] rounded-sm px-2 py-0.5 shrink-0">VIEWING</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* World info rows */}
                {worldBuilders.length > 0 && (
                  <div className="border-t border-bone/[0.08] px-4 py-3">
                    <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-2">Built by</span>
                    <div className="flex flex-wrap gap-1">
                      {worldBuilders.map(b => <MemberCard key={b.userId} member={b} />)}
                    </div>
                  </div>
                )}

                {collaboratorMembers.length > 0 && (
                  <div className="border-t border-bone/[0.08] px-4 py-3">
                    <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-2">Collaborators</span>
                    <div className="flex flex-wrap gap-1">
                      {collaboratorMembers.map(c => <MemberCard key={c.userId} member={c} />)}
                    </div>
                  </div>
                )}

                {toolsList.length > 0 && (
                  <div className="border-t border-bone/[0.08] px-4 py-3">
                    <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-2">Tools</span>
                    <div className="flex flex-wrap gap-1.5">
                      {toolsList.map(tool => (
                        <span key={tool} className="font-mono text-[9px] px-2 py-0.5 border border-bone/[0.08] rounded text-bone/50">{tool}</span>
                      ))}
                    </div>
                  </div>
                )}

                {hasSocialLinks && (
                  <div className="border-t border-bone/[0.08] px-4 py-3">
                    <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-2">Links</span>
                    <div className="flex gap-3">
                      {Object.entries(socialLinks!).map(([key, url]) =>
                        url ? (
                          <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="text-bone/30 hover:text-bone/60 transition-opacity" title={key}>
                            <SocialIcon type={key} size={16} />
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Preview panel */}
            <div className="border-l border-bone/[0.04] overflow-hidden bg-obsidian min-h-[200px]" style={{ maxHeight: '400px' }}>
              {activeProj ? (
                <div className="h-full grid grid-rows-[1fr_auto]">
                  <div className="relative overflow-hidden">
                    {activeProj.imageUrl ? (
                      <img src={activeProj.imageUrl} alt={activeProj.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-obsidian">
                        <span className="font-basement text-[48px] text-bone/10">{activeProj.name[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${COLOR_DOT[color]}`} />
                        {activeProj.tags && activeProj.tags[0] && <span className="font-mono text-[7px] uppercase tracking-wider text-bone/50">{activeProj.tags[0]}</span>}
                      </div>
                      <h2 className="font-basement font-black text-[clamp(24px,2.5vw,32px)] uppercase text-bone leading-[0.9]">{activeProj.name}</h2>
                    </div>
                  </div>
                  <div className="border-t border-bone/[0.06] p-3">
                    <p className="font-mono text-[10px] text-bone/40 leading-relaxed">{activeProj.description || 'Click to explore this project.'}</p>
                  </div>
                </div>
              ) : world.description ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 p-5 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-3">About</span>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{world.description}</ReactMarkdown>
                    </div>
                  </div>
                  {worldEvents.length > 0 && (
                    <div className="border-t border-bone/[0.06] p-4">
                      <span className="font-mono text-[7px] uppercase tracking-wider text-bone/30 block mb-2">Events</span>
                      <div className="space-y-1">
                        {worldEvents.slice(0, 3).map(ev => (
                          <Link key={ev.id} href={`/events/${ev.slug}`} className="flex items-center justify-between py-1.5 hover:bg-bone/[0.02] transition-colors rounded px-1 no-underline">
                            <span className="font-mono text-[10px] text-bone/60 font-bold uppercase truncate">{ev.eventName}</span>
                            {ev.date && <span className="font-mono text-[8px] text-bone/30 shrink-0 ml-2">{ev.date}</span>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full relative overflow-hidden">
                  <video src="/brand/vhs-loop.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none z-[2] opacity-[0.05]"
                    style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,240,232,0.3) 2px, rgba(245,240,232,0.3) 4px)' }}
                  />
                  <div className="absolute inset-0 pointer-events-none z-[3]" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }} />
                  <div className="absolute bottom-0 left-0 right-0 z-[4] bg-gradient-to-t from-obsidian/90 via-obsidian/40 to-transparent p-4">
                    <span className="font-basement font-black text-[clamp(24px,2vw,28px)] uppercase text-bone/80">EXPLORE</span>
                    <span className="font-mono text-[9px] text-bone/25 block mt-1">click a project</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Back link */}
          <div className="mt-4">
            <Link href="/worlds" className="font-mono text-[9px] uppercase tracking-wider opacity-40 hover:opacity-70 transition-opacity no-underline" style={{ color: 'var(--page-text)' }}>
              ← back to worlds
            </Link>
          </div>
        </div>
      </section>

      {selectedProject && (
        <ProjectPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onExpand={() => router.push(`/worlds/${slug}/projects/${selectedProject.slug}`)}
        />
      )}
    </PageShell>
  );
}
