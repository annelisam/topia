'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WorldGlobe from '../WorldGlobe';
import { getEmbedUrl, markdownComponents } from '../ProjectContent';
import { faviconUrl } from '../../resources/tools/favicon';
import { WorldConfig } from './worldConfig';

export interface ProjectItem {
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
  createdAt?: string;
}

export interface PanelTool {
  slug: string;
  name: string;
  url?: string | null;
  category?: string | null;
}

interface Credit {
  userId: string;
  role: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

// Same rule as everywhere tools are matched: lowercase alphanumerics only.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const AVATAR_FILLS = ['bg-lime text-obsidian', 'bg-blue text-bone', 'bg-pink text-obsidian', 'bg-green text-obsidian', 'bg-orange text-obsidian'];

/* ── Project Detail Slide Panel — a mini orbit file ───────────── */

function ProjectPanel({
  project,
  config,
  worldId,
  allTools,
  fullHref,
  onClose,
}: {
  project: ProjectItem;
  config: WorldConfig;
  worldId: string;
  allTools: PanelTool[];
  fullHref: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [credits, setCredits] = useState<Credit[]>([]);
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

  // The world's project list payload has no credits — pull them from the
  // single-project endpoint once the panel opens.
  useEffect(() => {
    let cancelled = false;
    setCredits([]);
    fetch(`/api/worlds/projects?worldId=${worldId}&slug=${encodeURIComponent(project.slug)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.project?.credits)) setCredits(d.project.credits); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [worldId, project.slug]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const hiddenTransform = isDesktop ? 'translateX(100%)' : 'translateY(100%)';

  const embed = project.videoUrl ? getEmbedUrl(project.videoUrl) : null;
  const allTags = (project.tags as string[] | null) || [];
  const toolNames = allTags.filter((t) => t.startsWith('tool:')).map((t) => t.replace('tool:', ''));
  const regularTags = allTags.filter((t) => !t.startsWith('tool:'));
  const projectLinks = (project.links as { label: string; url: string }[] | null) || [];
  const logged = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
    : null;
  const externalHref = (u: string) => (u.startsWith('http') ? u : `https://${u}`);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', opacity: visible ? 1 : 0, transition: 'opacity 300ms ease-out' }}
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        className="fixed z-50 overflow-y-auto bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl sm:rounded-t-none sm:bottom-auto sm:left-auto sm:top-0 sm:right-0 sm:h-full sm:w-[560px] lg:w-[640px] sm:max-w-[55vw] sm:max-h-none sm:pt-16 bg-[var(--page-bg)] border-l border-ink/10"
        style={{ transform: visible ? 'translate(0, 0)' : hiddenTransform, transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-ink/15" />
        </div>

        {/* Accent strip header — the panel is a pulled file from this world */}
        <div className={`sticky top-0 z-10 ${config.bg} px-4 py-2.5 flex items-center justify-between gap-3`}>
          <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-70 shrink-0`}>topia://project</span>
          <span className={`font-mono text-[12px] font-bold uppercase tracking-wider ${config.textOn} truncate`}>{project.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => router.push(fullHref)} className={`w-7 h-7 flex items-center justify-center rounded-md transition hover:opacity-60 cursor-pointer bg-transparent border-none ${config.textOn}`} title="Open full page">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button onClick={handleClose} className={`w-7 h-7 flex items-center justify-center rounded-md transition hover:opacity-60 font-mono text-[17px] cursor-pointer bg-transparent border-none ${config.textOn}`}>×</button>
          </div>
        </div>

        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 250ms ease-out 100ms, transform 250ms ease-out 100ms' }}>
          {/* Media hero */}
          {embed ? (
            <div className="w-full overflow-hidden border-b border-ink/[0.06]" style={{ aspectRatio: embed.vertical ? '9/16' : '16/9', maxHeight: embed.vertical ? '380px' : undefined }}>
              <iframe src={embed.src} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: 'none' }} title={project.name} />
            </div>
          ) : project.imageUrl ? (
            <div className="w-full max-h-[300px] overflow-hidden border-b border-ink/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover" />
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            {/* Designation + declaration */}
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">designation</span>
            <h3 className="font-basement font-black text-[clamp(20px,4vw,28px)] leading-[0.92] uppercase text-ink mt-0.5">{project.name}</h3>
            {project.description && (
              <p className="font-zirkon text-[12px] text-ink/50 italic mt-2 leading-relaxed">&ldquo;{project.description}&rdquo;</p>
            )}

            {/* Meta band */}
            <div className="py-3 mt-3 border-t border-b border-ink/[0.05] flex flex-wrap gap-x-7 gap-y-3">
              {logged && (
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">logged</span>
                  <span className="font-mono text-[11px] text-ink/70 mt-0.5 block">{logged}</span>
                </div>
              )}
              {regularTags.length > 0 && (
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block">tags</span>
                  <span className="flex flex-wrap gap-1 mt-1">
                    {regularTags.map((tag) => (
                      <span key={tag} className="font-mono text-[9px] uppercase tracking-[1px] border border-ink/[0.1] rounded-[3px] px-1.5 py-0.5 text-ink/50">{tag}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Credits */}
            {credits.length > 0 && (
              <div className="py-3 border-b border-ink/[0.05]">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block mb-1.5">credits</span>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {credits.map((c, i) => {
                    const initial = (c.name || c.username || '?')[0]?.toUpperCase();
                    const inner = (
                      <span className="flex items-center gap-2">
                        {c.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-ink/10 shrink-0" />
                        ) : (
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-basement font-black text-[9px] shrink-0 ${AVATAR_FILLS[i % AVATAR_FILLS.length]}`}>{initial}</span>
                        )}
                        <span className="min-w-0">
                          <span className="font-mono text-[11px] font-bold text-ink block truncate">{c.name || c.username || 'Unknown'}</span>
                          {c.role && <span className="font-mono text-[8px] uppercase tracking-[1px] block" style={{ color: 'var(--accent-ink)' }}>{c.role}</span>}
                        </span>
                      </span>
                    );
                    return c.username ? (
                      <Link key={c.userId} href={`/profile/${c.username}`} className="no-underline hover:opacity-80 transition-opacity">{inner}</Link>
                    ) : (
                      <span key={c.userId}>{inner}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tools used */}
            {toolNames.length > 0 && (
              <div className="py-3 border-b border-ink/[0.05]">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block mb-1.5">tools used</span>
                <div className="flex flex-wrap gap-1.5">
                  {toolNames.map((name) => {
                    const match = allTools.find((t) => norm(t.name) === norm(name) || norm(t.slug) === norm(name));
                    const fav = match ? faviconUrl(match.url ?? null, 32) : null;
                    const chip = (
                      <span className="inline-flex items-center gap-1.5 border border-ink/[0.1] rounded-[5px] px-2 py-1">
                        <span className="w-4 h-4 rounded-sm overflow-hidden bg-ink/[0.05] flex items-center justify-center shrink-0">
                          {fav ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fav} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="font-mono text-[8px] text-ink/40">{name[0]?.toUpperCase()}</span>
                          )}
                        </span>
                        <span className="font-mono text-[10.5px] text-ink">{match?.name || name}</span>
                      </span>
                    );
                    return match ? (
                      <Link key={name} href={`/resources/tools/${match.slug}`} className="no-underline hover:opacity-75 transition-opacity">{chip}</Link>
                    ) : (
                      <span key={name}>{chip}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Field notes */}
            {project.content && (
              <div className="py-4 border-b border-ink/[0.05]">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{project.content}</ReactMarkdown>
              </div>
            )}

            {/* Links */}
            {(project.url || projectLinks.length > 0) && (
              <div className="py-3 flex flex-wrap gap-1.5">
                {project.url && (
                  <a href={externalHref(project.url)} target="_blank" rel="noopener noreferrer" className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm no-underline ${config.bg} ${config.textOn}`}>
                    Visit →
                  </a>
                )}
                {projectLinks.map((link, i) => (
                  <a key={i} href={externalHref(link.url)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-sm border border-ink/[0.12] text-ink/70 hover:border-ink/30 transition-colors no-underline">
                    {link.label} →
                  </a>
                ))}
              </div>
            )}

            {/* Full file */}
            <Link href={fullHref} className="mt-2 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[1.5px] border border-ink/[0.12] rounded-md px-3.5 py-2.5 no-underline text-ink hover:border-ink/35 transition-colors">
              Open the full file <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Projects Layer ───────────────────────────────────────────── */

export default function ProjectsLayer({
  config,
  projects,
  slug,
  worldId,
  allTools = [],
}: {
  config: WorldConfig;
  projects: ProjectItem[];
  slug: string;
  worldId: string;
  allTools?: PanelTool[];
}) {
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [view, setView] = useState<'galaxy' | 'index'>('galaxy');

  const openProject = useCallback((proj: { id: string; name: string; slug: string } | null) => {
    if (!proj) { setSelectedProject(null); return; }
    const full = projects.find((p) => p.id === proj.id);
    setSelectedProject(full || (proj as ProjectItem));
  }, [projects]);

  const isEmpty = projects.length === 0;

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      {/* Quiet toolbar — the tab above already names the section; this row only
          carries the view toggle so it doesn't compete with the tab bar. */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-ink/[0.06]">
        <span className="font-mono text-[9px] uppercase tracking-[2px] text-ink/30">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
        <div className="flex items-center rounded-full overflow-hidden border border-ink/15">
          <button
            onClick={() => setView('galaxy')}
            className={`font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 cursor-pointer border-none transition-colors ${view === 'galaxy' ? `${config.bg} ${config.textOn} font-bold` : 'text-ink/45 hover:text-ink/70 bg-transparent'}`}
          >
            Galaxy
          </button>
          <button
            onClick={() => setView('index')}
            className={`font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 cursor-pointer border-none transition-colors ${view === 'index' ? `${config.bg} ${config.textOn} font-bold` : 'text-ink/45 hover:text-ink/70 bg-transparent'}`}
          >
            Index
          </button>
        </div>
      </div>

      {/* Globe — interactive when populated, ambient when empty */}
      {view === 'galaxy' && (
        <div className="relative overflow-hidden border-b border-ink/[0.06]" style={{ height: isEmpty ? 'max(34vh, 260px)' : 'max(40vh, 300px)' }}>
          <WorldGlobe projects={projects} onSelectProject={openProject} selectedProjectSlug={selectedProject?.slug || null} />
          <div className="absolute bottom-3 left-4 z-10 pointer-events-none">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink/30">topia://{slug}</span>
          </div>
          {isEmpty && (
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-7 pointer-events-none">
              <span className="font-mono text-[12px] uppercase tracking-[2px] text-ink/40">No projects in orbit yet</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/25">this world is still being built</span>
            </div>
          )}
        </div>
      )}

      {/* Galaxy manifest — compact rows under the globe; the index keeps cards */}
      {view === 'galaxy' && !isEmpty && (
        <div className="px-4 py-2">
          {projects.map((proj, i) => {
            const firstTag = ((proj.tags as string[] | null) || []).find((t) => !t.startsWith('tool:'));
            const logged = proj.createdAt
              ? new Date(proj.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
              : null;
            const isSelected = selectedProject?.slug === proj.slug;
            return (
              <button
                key={proj.id}
                onClick={() => openProject(proj)}
                onMouseEnter={() => setActiveSlug(proj.slug)}
                onMouseLeave={() => setActiveSlug(null)}
                className="w-full flex items-center gap-3 py-2.5 border-b border-ink/[0.05] last:border-b-0 text-left cursor-pointer bg-transparent border-x-0 border-t-0 group"
              >
                <span className="font-mono text-[9px] text-ink/30 tabular-nums shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="w-10 h-7 rounded border border-ink/10 overflow-hidden shrink-0 bg-ink/[0.04]">
                  {proj.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proj.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-[12px] font-bold uppercase block truncate transition-colors" style={{ color: isSelected || activeSlug === proj.slug ? config.hex : 'var(--page-text)' }}>{proj.name}</span>
                  {proj.description && <span className="font-mono text-[10.5px] text-ink/40 block truncate">{proj.description}</span>}
                </span>
                {firstTag && <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[1px] border border-ink/[0.1] rounded-[3px] px-1.5 py-0.5 text-ink/45 shrink-0">{firstTag}</span>}
                {logged && <span className="hidden md:inline font-mono text-[9.5px] uppercase tracking-wider text-ink/30 shrink-0">{logged}</span>}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink/25 group-hover:text-ink/60 transition-colors"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
              </button>
            );
          })}
        </div>
      )}

      {/* Index — flat browsable card grid, the peer view to the galaxy */}
      {view === 'index' && isEmpty && (
        <div className="flex-1 flex items-center justify-center py-10">
          <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No projects yet</span>
        </div>
      )}
      {view === 'index' && !isEmpty && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((proj) => {
            const isSelected = selectedProject?.slug === proj.slug;
            return (
              <button
                key={proj.id}
                onClick={() => openProject(proj)}
                onMouseEnter={() => setActiveSlug(proj.slug)}
                onMouseLeave={() => setActiveSlug(null)}
                className="group flex flex-col text-left rounded-lg overflow-hidden border bg-[var(--page-bg)] transition-colors cursor-pointer"
                style={{ borderColor: isSelected ? config.hex : 'color-mix(in srgb, var(--page-text) 8%, transparent)' }}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ink/[0.04]">
                  {proj.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proj.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-basement font-black text-[clamp(28px,6vw,44px)] uppercase text-ink/10">{proj.name[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78), transparent 55%)' }} />
                  {proj.tags && proj.tags[0] && <span className="absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[2px] text-bone/70">{proj.tags[0]}</span>}
                  {isSelected && <span className="absolute top-2.5 right-2.5 font-mono text-[8px] uppercase tracking-wider rounded-sm px-2 py-0.5 backdrop-blur-sm" style={{ backgroundColor: config.hex, color: '#0a0a0a' }}>viewing</span>}
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-bold uppercase truncate transition-colors" style={{ color: isSelected || activeSlug === proj.slug ? config.hex : 'var(--page-text)' }}>{proj.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink/30 group-hover:text-ink/60 transition-colors"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedProject && (
        <ProjectPanel
          project={selectedProject}
          config={config}
          worldId={worldId}
          allTools={allTools}
          fullHref={`/worlds/${slug}/projects/${selectedProject.slug}`}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
