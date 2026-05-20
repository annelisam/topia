'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export interface OverviewStats {
  followers: number;
  following: number;
  worlds: number;
  events: number;
  deltas: { followers?: number; worlds?: number; events?: number };
}

export interface WorldInvite {
  id: string;
  role: string;
  createdAt: string;
  worldTitle: string;
  worldSlug: string;
  worldImageUrl: string | null;
  inviterName: string | null;
  inviterUsername: string | null;
  inviterAvatar: string | null;
}

export interface EventInvite {
  id: string;
  createdAt: string;
  eventName: string;
  eventSlug: string;
  eventImageUrl: string | null;
  eventDate: string | null;
  inviterName: string | null;
  inviterUsername: string | null;
  inviterAvatar: string | null;
}

export interface UpcomingEvent {
  id: string;
  eventName: string;
  slug: string;
  dateIso: string | null;
  date: string | null;
  startTime: string | null;
  city: string | null;
  imageUrl: string | null;
  role: 'hosting' | 'attending';
}

export interface NotifItem {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatar: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SavedToolItem {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  category: string | null;
}

export interface OverviewData {
  stats: OverviewStats;
  invitations: { worldInvitations: WorldInvite[]; eventInvitations: EventInvite[]; total: number };
  upcoming: UpcomingEvent[];
  notifications: NotifItem[];
  savedTools: SavedToolItem[];
}

interface CtxValue {
  data: OverviewData | null;
  loading: boolean;
  /** Dismiss an invitation locally (after Accept/Decline) without refetching. */
  dismissWorldInvitation: (id: string) => void;
  dismissEventInvitation: (id: string) => void;
}

const Ctx = createContext<CtxValue>({
  data: null,
  loading: true,
  dismissWorldInvitation: () => {},
  dismissEventInvitation: () => {},
});

export function useOverview() { return useContext(Ctx); }

export function DashboardOverviewProvider({ children }: { children: ReactNode }) {
  const { authenticated, user } = usePrivy();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated || !user?.id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/overview?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((json: OverviewData) => {
        if (cancelled) return;
        setData(json);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authenticated, user?.id]);

  function dismissWorldInvitation(id: string) {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        invitations: {
          ...d.invitations,
          worldInvitations: d.invitations.worldInvitations.filter((i) => i.id !== id),
          total: d.invitations.total - 1,
        },
      };
    });
  }

  function dismissEventInvitation(id: string) {
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        invitations: {
          ...d.invitations,
          eventInvitations: d.invitations.eventInvitations.filter((i) => i.id !== id),
          total: d.invitations.total - 1,
        },
      };
    });
  }

  return (
    <Ctx.Provider value={{ data, loading, dismissWorldInvitation, dismissEventInvitation }}>
      {children}
    </Ctx.Provider>
  );
}
