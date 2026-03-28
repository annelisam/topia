'use client';

import { createContext, useContext } from 'react';
import type { WorldMembership, UserProfile } from '../../hooks/useUserProfile';

interface HostedEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  city: string | null;
  imageUrl: string | null;
}

interface DashboardContextValue {
  profile: UserProfile | null;
  worldMemberships: WorldMembership[];
  hostedEvents: HostedEvent[];
}

export const DashboardContext = createContext<DashboardContextValue>({
  profile: null,
  worldMemberships: [],
  hostedEvents: [],
});

export function useDashboard() {
  return useContext(DashboardContext);
}

export type { HostedEvent };
