'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface Badges { messagesUnread: number; requestCount: number; notificationsUnread: number; }
interface BadgesCtx extends Badges { refreshBadges: () => void; }

const EMPTY: Badges = { messagesUnread: 0, requestCount: 0, notificationsUnread: 0 };
const BadgesContext = createContext<BadgesCtx>({ ...EMPTY, refreshBadges: () => {} });

export const useBadges = () => useContext(BadgesContext);

const POLL_MS = 45000;

// Single shared poller for the nav badges (messages + notifications). One request
// per logged-in user every 45s, instead of two separate 30s polls. Pauses while
// the tab is hidden. Components call refreshBadges() after an action (read a
// thread, mark notifications read) to update immediately.
export default function BadgesProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, user } = usePrivy();
  const [badges, setBadges] = useState<Badges>(EMPTY);

  const refreshBadges = useCallback(() => {
    if (!authenticated || !user) { setBadges(EMPTY); return; }
    fetch(`/api/me/badges?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((d: Badges) => setBadges(d))
      .catch(() => {});
  }, [authenticated, user]);

  useEffect(() => {
    refreshBadges();
    let id = setInterval(refreshBadges, POLL_MS);
    const onVis = () => {
      clearInterval(id);
      if (!document.hidden) { refreshBadges(); id = setInterval(refreshBadges, POLL_MS); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [refreshBadges]);

  return <BadgesContext.Provider value={{ ...badges, refreshBadges }}>{children}</BadgesContext.Provider>;
}
