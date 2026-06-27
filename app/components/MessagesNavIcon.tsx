'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

// Polls the lightweight unread endpoint, shared by the desktop nav icon and the
// mobile tab bar. badge = unread Primary messages + pending Requests.
export function useMessagesBadge(): number {
  const { authenticated, user } = usePrivy();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    if (!authenticated || !user) { setCount(0); return; }
    fetch(`/api/messages/unread?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((d) => setCount((d.unreadTotal ?? 0) + (d.requestCount ?? 0)))
      .catch(() => {});
  }, [authenticated, user]);

  useEffect(() => {
    fetchCount();
    let interval = setInterval(fetchCount, 30000);
    const onVis = () => {
      clearInterval(interval);
      if (!document.hidden) { fetchCount(); interval = setInterval(fetchCount, 30000); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, [fetchCount]);

  return count;
}

export default function MessagesNavIcon() {
  const { authenticated } = usePrivy();
  const count = useMessagesBadge();
  if (!authenticated) return null;

  return (
    <Link href="/messages" className="relative hover:opacity-70 transition p-1" aria-label="Messages" style={{ color: 'var(--foreground)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold"
          style={{ backgroundColor: 'var(--accent, #e4fe52)', color: '#1a1a1a' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
