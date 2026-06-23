'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import WorldGlobe from '../WorldGlobe';
import ProjectContent from '../ProjectContent';
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
}

/* ── Project Detail Slide Panel ───────────────────────────────── */

function ProjectPanel({ project, onClose, onExpand }: { project: ProjectItem; onClose: () => void; onExpand: () => void }) {
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

/* ── Projects Layer ───────────────────────────────────────────── */

export default function ProjectsLayer({
  config,
  projects,
  slug,
}: {
  config: WorldConfig;
  projects: ProjectItem[];
  slug: string;
}) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const openProject = useCallback((proj: { id: string; name: string; slug: string } | null) => {
    if (!proj) { setSelectedProject(null); return; }
    const full = projects.find((p) => p.id === proj.id);
    setSelectedProject(full || (proj as ProjectItem));
  }, [projects]);

  const isEmpty = projects.length === 0;

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Projects</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>

      {/* Globe — interactive when populated, ambient when empty */}
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

      {/* Project card grid — consistent with Team / Events */}
      {!isEmpty && (
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
          onClose={() => setSelectedProject(null)}
          onExpand={() => router.push(`/worlds/${slug}/projects/${selectedProject.slug}`)}
        />
      )}
    </div>
  );
}
