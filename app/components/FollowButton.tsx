'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, initialIsFollowing = false, onFollowChange }: FollowButtonProps) {
  const { authenticated, user } = usePrivy();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);

  if (!authenticated) return null;

  const handleToggle = async () => {
    if (busy || !user) return;
    setBusy(true);
    try {
      if (isFollowing) {
        await fetch('/api/follow', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, targetUserId }),
        });
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, targetUserId }),
        });
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className="font-mono text-[10px] uppercase tracking-tight border px-3 py-1 hover:opacity-70 transition disabled:opacity-40"
      style={{
        color: isFollowing ? 'var(--background)' : 'var(--foreground)',
        backgroundColor: isFollowing ? 'var(--foreground)' : 'transparent',
        borderColor: 'var(--foreground)',
      }}
    >
      {busy ? '...' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}
    </button>
  );
}
