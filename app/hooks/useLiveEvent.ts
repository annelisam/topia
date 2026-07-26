'use client';

import { useEffect, useState } from 'react';
import { eventLocalToday } from '@/lib/events/localDay';

export type LiveInvolvement = 'checkedin' | 'host' | 'going' | 'none';

export interface LiveEvent {
  slug: string;
  eventName: string;
  startTime: string | null;
  city: string | null;
  checkedIn: boolean;
  isHost: boolean;
  involvement: LiveInvolvement;
  goingCount: number;
}

// One live-now lookup per minute shared across every consumer (the nav
// remounts on every route change — don't re-hit the API each time). Keyed by
// viewer so a login mid-session refetches with their involvement.
let liveCache: { at: number; date: string; key: string; event: LiveEvent | null } | null = null;

// Device-local event day (late-night grace included) — NOT the raw calendar
// date. Kept as the one date every live-event consumer sends/keys on.
export function localDate(): string {
  return eventLocalToday();
}

// Today's live event for this viewer — works logged-out too (involvement
// comes back 'none'). Pass enabled=false to hold the fetch until auth state
// is known, so an RSVP'd user isn't briefly treated as a stranger.
export function useLiveEvent(privyId: string | undefined, enabled = true): LiveEvent | null {
  const key = privyId ?? 'anon';
  const [live, setLive] = useState<LiveEvent | null>(() =>
    liveCache && liveCache.key === key ? liveCache.event : null);
  useEffect(() => {
    if (!enabled) return;
    const date = localDate();
    if (liveCache && liveCache.key === key && liveCache.date === date && Date.now() - liveCache.at < 60_000) {
      setLive(liveCache.event);
      return;
    }
    let cancelled = false;
    const qs = privyId ? `privyId=${encodeURIComponent(privyId)}&` : '';
    fetch(`/api/events/live-now?${qs}date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const event = (d?.event as LiveEvent | undefined) ?? null;
        liveCache = { at: Date.now(), date, key, event };
        if (!cancelled) setLive(event);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [privyId, key, enabled]);
  return live;
}
