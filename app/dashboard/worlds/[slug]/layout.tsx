'use client';

import { createContext, useContext, useState, useEffect, use, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingBar from '../../../components/LoadingBar';
import { WorldData, ToolOption, PendingInvite, ProjectItem } from '../../_components/types';

/* ── Context ─────────────────────────────────────────────────── */

interface WorldDashboardContextValue {
  world: WorldData;
  slug: string;
  projects: ProjectItem[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  allTools: ToolOption[];
  currentUserId: string;
  privyId: string;
  members: WorldData['members'];
  setMembers: React.Dispatch<React.SetStateAction<WorldData['members']>>;
  pendingInvites: PendingInvite[];
  setPendingInvites: React.Dispatch<React.SetStateAction<PendingInvite[]>>;
  imageUrl: string;
  setImageUrl: React.Dispatch<React.SetStateAction<string>>;
  isBuilder: boolean;
  isOwner: boolean;
  currentUserRole: string;
}

const WorldDashboardContext = createContext<WorldDashboardContextValue | null>(null);

export function useWorldDashboard() {
  const ctx = useContext(WorldDashboardContext);
  if (!ctx) throw new Error('useWorldDashboard must be used within WorldDashboardLayout');
  return ctx;
}

/* ── Layout ──────────────────────────────────────────────────── */

export default function WorldDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();

  const [world, setWorld] = useState<WorldData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState<WorldData['members']>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [allTools, setAllTools] = useState<ToolOption[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  /* Fetch world, tools, user profile */
  useEffect(() => {
    const worldP = fetch(`/api/worlds?slug=${slug}${ready && authenticated && user?.id ? `&manage=1&privyId=${encodeURIComponent(user.id)}` : ''}`)
      .then(r => r.json())
      .then(data => {
        if (data.worlds?.length > 0) {
          const w = data.worlds[0];
          setWorld(w);
          setImageUrl(w.imageUrl || '');
          setMembers(w.members || []);
          setPendingInvites(w.pendingInvites || []);
        }
      });

    const toolsP = fetch('/api/tools')
      .then(r => r.json())
      .then(d => setAllTools(d.tools || []))
      .catch(() => {});

    const userP =
      ready && authenticated && user?.id
        ? fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
            .then(r => r.json())
            .then(d => { if (d.user) setCurrentUserId(d.user.id); })
            .catch(() => {})
        : Promise.resolve();

    Promise.all([worldP, toolsP, userP])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, ready, authenticated, user?.id]);

  /* Fetch projects once world loads */
  useEffect(() => {
    if (!world?.id) return;
    fetch(`/api/worlds/projects?worldId=${world.id}`)
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(console.error);
  }, [world?.id]);

  /* Authorization check — any member can view, only owners/builders can edit */
  const currentMember = world && currentUserId ? world.members.find(m => m.userId === currentUserId) : null;
  const isMember = !!currentMember;
  const isOwner = currentMember?.role === 'owner';
  const isBuilder = isOwner || currentMember?.role === 'world_builder';
  const currentUserRole = currentMember?.role || '';

  useEffect(() => {
    if (world && currentUserId)
      setAuthorized(isMember);
  }, [world, currentUserId, isMember]);

  /* If the slug doesn't resolve to a world, bounce back to the worlds list
     after a moment (e.g. a stale/typed URL like /dashboard/worlds/details). */
  useEffect(() => {
    if (loading || !ready || world) return;
    const t = setTimeout(() => router.replace('/dashboard/worlds'), 4000);
    return () => clearTimeout(t);
  }, [loading, ready, world, router]);

  /* Guards */
  if (loading || !ready || (authenticated && !currentUserId))
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingBar />
      </div>
    );

  if (!world)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-4">
        <p className="font-mono text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>World not found</p>
        <p className="font-mono text-[12px] opacity-60 max-w-xs" style={{ color: 'var(--foreground)' }}>
          “{slug}” doesn’t match a world you can manage. It may have been removed, or the link is missing a world.
        </p>
        <Link
          href="/dashboard/worlds"
          className="font-mono text-[12px] uppercase tracking-widest px-4 py-2 rounded-lg border no-underline hover:opacity-70 transition"
          style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
        >
          ← Back to your worlds
        </Link>
        <p className="font-mono text-[11px] opacity-40" style={{ color: 'var(--foreground)' }}>Taking you there…</p>
      </div>
    );

  if (!authenticated || !authorized)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>
          {!authenticated ? 'Please log in.' : 'Not authorized.'}
        </p>
      </div>
    );

  return (
    <WorldDashboardContext.Provider
      value={{
        world,
        slug,
        projects,
        setProjects,
        allTools,
        currentUserId: currentUserId!,
        privyId: user!.id,
        members,
        setMembers,
        pendingInvites,
        setPendingInvites,
        imageUrl,
        setImageUrl,
        isBuilder,
        isOwner,
        currentUserRole,
      }}
    >
      {/* World identity header — shared by every manage subpage so you always
          know which world you're editing. */}
      <div className="border border-ink/[0.08] rounded-lg overflow-hidden mb-6">
        <div className="bg-lime px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrl} alt="" className="w-11 h-11 rounded-sm object-cover border border-obsidian/20 shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-sm bg-obsidian flex items-center justify-center shrink-0">
                <span className="font-basement text-[18px] text-lime">{world.title[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/50 block">topia://world-manage</span>
              {/* Wraps instead of truncating — long titles get smaller on
                  phones and break across lines, never "TEST WI." */}
              <h1 className="font-basement font-black text-[clamp(16px,4.5vw,28px)] uppercase leading-[1] text-obsidian mt-0.5 break-words [text-wrap:balance]">
                {world.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60 hidden sm:block">
              {currentUserRole === 'owner' ? 'Owner' : currentUserRole === 'world_builder' ? 'Builder' : 'Collab'}
            </span>
            <a
              href={`/worlds/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] uppercase tracking-[2px] bg-obsidian text-lime px-3 py-1.5 rounded-sm hover:opacity-90 transition no-underline font-bold"
            >
              View ↗
            </a>
          </div>
        </div>
      </div>
      {children}
    </WorldDashboardContext.Provider>
  );
}
