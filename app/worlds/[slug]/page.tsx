'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../components/Navigation';
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

const FLAG_MAP: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', SE: '\u{1F1F8}\u{1F1EA}', DE: '\u{1F1E9}\u{1F1EA}', NL: '\u{1F1F3}\u{1F1F1}', GB: '\u{1F1EC}\u{1F1E7}',
  FR: '\u{1F1EB}\u{1F1F7}', JP: '\u{1F1EF}\u{1F1F5}', CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}', IT: '\u{1F1EE}\u{1F1F9}',
};

/* markdownComponents and getEmbedUrl imported from ProjectContent */

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

  // Detect desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  // Close on escape
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
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease-out',
        }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed z-50 overflow-y-auto bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl sm:rounded-t-none sm:bottom-auto sm:left-auto sm:top-0 sm:right-0 sm:h-full sm:w-[560px] lg:w-[640px] sm:max-w-[55vw] sm:max-h-none sm:pt-16"
        style={{
          backgroundColor: 'var(--background)',
          borderLeft: '1px solid var(--border-color)',
          transform: visible ? 'translate(0, 0)' : hiddenTransform,
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--foreground)', opacity: 0.15 }} />
        </div>

        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="font-mono text-[13px] font-bold uppercase truncate pr-4" style={{ color: 'var(--foreground)' }}>
            {project.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onExpand}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-60"
              style={{ color: 'var(--foreground)' }}
              title="Open full page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition hover:opacity-60 font-mono text-[18px]"
              style={{ color: 'var(--foreground)' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content with stagger animation */}
        <div
          className="p-5 sm:p-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 250ms ease-out 100ms, transform 250ms ease-out 100ms',
          }}
        >
          <ProjectContent project={project} maxImageHeight="250px" />
        </div>
      </div>

    </>
  );
}

/* ── Member Card ──────────────────────────────────────────────── */

function MemberCard({ member }: { member: WorldMember }) {
  const inner = (
    <div className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg theme-hover-surface transition-colors">
      {member.userAvatarUrl ? (
        <img src={member.userAvatarUrl} alt={member.userName || ''} className="w-8 h-8 rounded-full object-cover border" style={{ borderColor: 'var(--border-color)' }} />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
          {(member.userName || member.userUsername || '?')[0]?.toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-mono text-[12px] font-bold leading-tight" style={{ color: 'var(--foreground)' }}>{member.userName || member.userUsername || 'Unknown'}</p>
        {member.userUsername && <p className="font-mono text-[10px] opacity-40 leading-tight" style={{ color: 'var(--foreground)' }}>@{member.userUsername}</p>}
      </div>
    </div>
  );
  if (member.userUsername) return <Link href={`/profile/${member.userUsername}`} className="block">{inner}</Link>;
  return <div>{inner}</div>;
}

/* ── Main Page ────────────────────────────────────────────────── */

interface WorldEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
}

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { user, authenticated } = usePrivy();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const worldPromise = fetch(`/api/worlds?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.worlds && data.worlds.length > 0) setWorld(data.worlds[0]);
      });

    const userPromise = (authenticated && user?.id)
      ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
          .then(r => r.json())
          .then(d => { if (d.user) setCurrentUserId(d.user.id); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([worldPromise, userPromise])
      .catch(console.error)
      .finally(() => setLoading(false));
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
    setSelectedProject(full || proj);
  }, [projects]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <LoadingBar />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="worlds" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>World not found.</p>
        <Link href="/worlds" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Worlds</Link>
      </div>
    );
  }

  const worldBuilders = world.members?.filter(m => m.role === 'world_builder' || m.role === 'owner') || [];
  const collaboratorMembers = world.members?.filter(m => m.role === 'collaborator') || [];
  const isWorldBuilder = currentUserId && worldBuilders.some(b => b.userId === currentUserId);
  const socialLinks = world.socialLinks as SocialLinks | null;
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v);
  const toolsList = world.tools ? world.tools.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="worlds" />

      <div className="pt-16 sm:pt-20">
        {/* Top bar — back + manage */}
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between pt-4 pb-2">
          <Link href="/worlds" className="font-mono text-[11px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← Worlds
          </Link>
          {isWorldBuilder && (
            <Link
              href={`/dashboard/worlds/${world.slug}`}
              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full transition theme-hover-invert"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              Manage
            </Link>
          )}
        </div>

        {/* Globe — takes up the viewport */}
        <div className="relative w-full" style={{ height: 'max(80vh, 480px)', maxHeight: '780px' }}>
          <WorldGlobe
            projects={projects}
            onSelectProject={handleSelectProject}
            selectedProjectSlug={selectedProject?.slug || null}
          />

          {/* World title at bottom center */}
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center pointer-events-none px-4">
            <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-0.5" style={{ color: 'var(--foreground)' }}>
              {world.title}
            </h1>
            {world.shortDescription && (
              <p className="font-mono text-[12px] leading-relaxed max-w-sm mx-auto opacity-50" style={{ color: 'var(--foreground)' }}>
                {world.shortDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── World info below globe ────────────────────────────── */}
      <div className="container mx-auto px-4 sm:px-6 pb-16 pt-4">
        <div className="max-w-xl mx-auto">

          {/* Metadata row: category + country + socials */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {world.category && (
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                  {world.category}
                </span>
              )}
              {world.creatorCountry && <span className="text-[14px]">{FLAG_MAP[world.creatorCountry] || world.creatorCountry}</span>}
            </div>
            {hasSocialLinks && (
              <div className="flex gap-3">
                {Object.entries(socialLinks!).map(([key, url]) =>
                  url ? (
                    <a key={key} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" className="opacity-30 hover:opacity-60 transition-opacity" style={{ color: 'var(--foreground)' }} title={key}>
                      <SocialIcon type={key} size={16} />
                    </a>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Builders row */}
          {(worldBuilders.length > 0 || world.creatorName) && (
            <div className="mb-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold mb-2 opacity-40" style={{ color: 'var(--foreground)' }}>Built by</p>
              {worldBuilders.length > 0 ? (
                <div className="flex flex-wrap gap-1">{worldBuilders.map(b => <MemberCard key={b.userId} member={b} />)}</div>
              ) : world.creatorName ? (
                <Link href={`/worlds/creator/${world.creatorSlug}`} className="font-mono text-[13px] hover:opacity-60 transition underline" style={{ color: 'var(--foreground)' }}>{world.creatorName}</Link>
              ) : null}
            </div>
          )}

          {/* About */}
          {world.description && (
            <div className="mb-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold mb-2 opacity-40" style={{ color: 'var(--foreground)' }}>About</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{world.description}</ReactMarkdown>
            </div>
          )}

          {/* Tools + Collaborators — side by side on desktop */}
          {(toolsList.length > 0 || collaboratorMembers.length > 0 || world.collaborators) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {toolsList.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold mb-2 opacity-40" style={{ color: 'var(--foreground)' }}>Tools</p>
                  <div className="flex flex-wrap gap-1.5">
                    {toolsList.map(tool => (
                      <span key={tool} className="font-mono text-[11px] tracking-tight px-2.5 py-1 rounded-lg border" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>{tool}</span>
                    ))}
                  </div>
                </div>
              )}
              {(collaboratorMembers.length > 0 || world.collaborators) && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold mb-2 opacity-40" style={{ color: 'var(--foreground)' }}>Collaborators</p>
                  {collaboratorMembers.length > 0 && <div className="flex flex-wrap gap-1">{collaboratorMembers.map(c => <MemberCard key={c.userId} member={c} />)}</div>}
                  {world.collaborators && <p className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>{world.collaborators}</p>}
                </div>
              )}
            </div>
          )}

          {/* Events */}
          {worldEvents.length > 0 && (
            <div className="mb-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold mb-2 opacity-40" style={{ color: 'var(--foreground)' }}>Events</p>
              <div className="space-y-2">
                {worldEvents.map((ev) => (
                  <Link key={ev.id} href={`/events/${ev.slug}`} className="border rounded-xl transition-colors duration-200 group block overflow-hidden" style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)', backgroundColor: 'var(--surface)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}>
                    {ev.imageUrl && <div className="w-full h-28 overflow-hidden"><img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} /></div>}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <h3 className="font-mono text-[13px] sm:text-[15px] font-bold uppercase leading-tight" style={{ color: 'var(--foreground)' }}>{ev.eventName}</h3>
                      {(ev.date || ev.city) && <span className="font-mono text-[9px] uppercase opacity-40 shrink-0 ml-2">{[ev.date, ev.city].filter(Boolean).join(' · ')}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {world.dateAdded && (
            <p className="font-mono text-[10px] opacity-30 mt-8" style={{ color: 'var(--foreground)' }}>Created {world.dateAdded}</p>
          )}
        </div>
      </div>

      {/* ── Slide-in project panel ────────────────────────────── */}
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
