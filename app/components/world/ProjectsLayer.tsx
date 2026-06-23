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
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const handleSelectProject = useCallback((proj: { id: string; name: string; slug: string } | null) => {
    if (!proj) { setSelectedProject(null); return; }
    const full = projects.find((p) => p.id === proj.id);
    setSelectedProject(full || (proj as ProjectItem));
  }, [projects]);

  const activeProj = projects.find((p) => p.slug === activeProject);

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Projects</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>

      {/* Globe */}
      <div className="relative overflow-hidden" style={{ height: 'max(38vh, 280px)' }}>
        <WorldGlobe projects={projects} onSelectProject={handleSelectProject} selectedProjectSlug={selectedProject?.slug || null} />
        <div className="absolute bottom-3 left-4 z-10">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink/40">topia://{slug}</span>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[13px] tracking-wider">
          {activeProj ? (
            <><span className="text-ink/40">project:</span> <span className="font-bold" style={{ color: config.hex }}>{activeProj.name}</span></>
          ) : <span className="text-ink/40">hover a project to preview</span>}
        </span>
        <div className="flex items-center gap-2">
          {projects.map((p) => (
            <div key={p.id} className={`w-1.5 h-1.5 rounded-full ${activeProject === p.slug ? 'scale-[2]' : 'opacity-40'} transition-all`} style={{ backgroundColor: config.hex }} />
          ))}
        </div>
      </div>

      {/* Ledger + preview */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Ledger index */}
        <div className="relative overflow-y-auto min-h-[200px] border-b md:border-b-0 border-ink/[0.06]" style={{ scrollbarWidth: 'thin', maxHeight: '400px' }}>
          <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-ink/[0.06] pointer-events-none z-[1]" />
          <div className="relative z-10">
            {projects.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <span className="font-mono text-[13px] text-ink/30 uppercase tracking-wider">No projects yet</span>
              </div>
            ) : projects.map((proj, i) => {
              const isActive = activeProject === proj.slug;
              const isSelected = selectedProject?.slug === proj.slug;
              return (
                <div
                  key={proj.id}
                  className={`flex items-center cursor-pointer transition-all duration-150 border-b border-ink/[0.04] ${isSelected ? 'bg-ink/[0.06]' : isActive ? 'bg-ink/[0.04]' : 'hover:bg-ink/[0.02]'}`}
                  style={{ minHeight: '48px' }}
                  onMouseEnter={() => setActiveProject(proj.slug)}
                  onMouseLeave={() => setActiveProject(null)}
                  onClick={() => handleSelectProject(selectedProject?.slug === proj.slug ? null : proj)}
                >
                  <div className="w-[28px] shrink-0 flex items-center justify-center">
                    <span className="font-mono text-[13px] text-ink/20">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: config.hex }} />
                  <div className="flex-1 flex items-center justify-between px-3 py-2.5 min-w-0">
                    <div className="min-w-0">
                      <span className="font-mono text-[13px] uppercase font-bold truncate block transition-colors" style={{ color: isSelected || isActive ? config.hex : 'color-mix(in srgb, var(--page-text) 50%, transparent)' }}>{proj.name}</span>
                      {proj.tags && proj.tags.length > 0 && <span className="font-mono text-[11px] text-ink/30">{proj.tags[0]}</span>}
                    </div>
                    {isSelected && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink/30 border border-ink/[0.12] rounded-sm px-2 py-0.5 shrink-0">VIEWING</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-hidden md:border-l border-ink/[0.06] min-h-[200px]" style={{ maxHeight: '400px' }}>
          {activeProj ? (
            <div className="h-full grid grid-rows-[1fr_auto]">
              <div className="relative overflow-hidden">
                {activeProj.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeProj.imageUrl} alt={activeProj.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-ink/[0.03]">
                    <span className="font-basement text-[48px] text-ink/10">{activeProj.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2) 50%, transparent)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.hex }} />
                    {activeProj.tags && activeProj.tags[0] && <span className="font-mono text-[11px] uppercase tracking-wider text-bone/60">{activeProj.tags[0]}</span>}
                  </div>
                  <h2 className="font-basement font-black text-[clamp(22px,2.5vw,30px)] uppercase text-bone leading-[0.9]">{activeProj.name}</h2>
                </div>
              </div>
              <div className="border-t border-ink/[0.06] p-3">
                <p className="font-mono text-[13px] text-ink/50 leading-relaxed">{activeProj.description || 'Click to explore this project.'}</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-1 p-6 text-center">
              <span className="font-basement font-black text-[clamp(22px,2vw,28px)] uppercase text-ink/15">EXPLORE</span>
              <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">hover or click a project</span>
            </div>
          )}
        </div>
      </div>

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
