'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useBadges } from './BadgesProvider';

// Messages badge (unread Primary + pending Requests), sourced from the shared
// BadgesProvider poll so the nav icon and mobile tab bar don't each fetch.
export function useMessagesBadge(): number {
  const { messagesUnread, requestCount } = useBadges();
  return messagesUnread + requestCount;
}

export default function MessagesNavIcon({ onClick }: { onClick: () => void }) {
  const { authenticated } = usePrivy();
  const count = useMessagesBadge();
  if (!authenticated) return null;

  return (
    <button onClick={onClick} className="relative flex items-center justify-center w-8 h-8 hover:opacity-70 transition bg-transparent border-none cursor-pointer" aria-label="Messages" style={{ color: 'var(--foreground)' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {count > 0 && (
        <span
          className="absolute top-0 right-0 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold"
          style={{ backgroundColor: 'var(--accent, #e4fe52)', color: '#1a1a1a' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
