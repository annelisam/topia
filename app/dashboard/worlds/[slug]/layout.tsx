'use client';

import { createContext, useContext, useState, useEffect, use, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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
    const worldP = fetch(`/api/worlds?slug=${slug}`)
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

  /* Guards */
  if (loading || !ready || (authenticated && !currentUserId))
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingBar />
      </div>
    );

  if (!world)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="font-mono text-[13px]" style={{ color: 'var(--foreground)' }}>World not found.</p>
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
      {children}
    </WorldDashboardContext.Provider>
  );
}
