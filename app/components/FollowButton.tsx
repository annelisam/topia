'use client';

import { useEffect, useState } from 'react';
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

  // Re-sync when the resolved follow state arrives (e.g. the guest list
  // refetches once the viewer is known), so a button mounted with a stale
  // value updates instead of being stuck on "Follow".
  useEffect(() => { setIsFollowing(initialIsFollowing); }, [initialIsFollowing]);

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
      className={`font-mono text-[10px] uppercase tracking-wider rounded-sm px-2.5 py-1 transition-colors disabled:opacity-40 ${
        isFollowing
          ? 'bg-transparent text-bone/60 border border-bone/20 hover:text-bone hover:border-bone/40'
          : 'bg-lime text-obsidian border border-lime font-bold hover:opacity-80'
      }`}
    >
      {busy ? '···' : isFollowing ? 'Connected' : 'Connect'}
    </button>
  );
}
