'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import Link from 'next/link';

export default function LoginButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // Sync user to our DB after login
  useEffect(() => {
    if (authenticated && user) {
      const email = user.email?.address
        ?? user.google?.email
        ?? user.linkedAccounts.find((a) => a.type === 'email')?.address
        ?? null;

      const phone = user.phone?.number ?? null;
      const walletAddress = user.wallet?.address ?? null;
      const name = user.google?.name ?? null;

      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          email,
          phone,
          walletAddress,
          name,
        }),
      }).catch(console.error);
    }
  }, [authenticated, user]);

  // Don't render until Privy is ready
  if (!ready) return null;

  if (authenticated) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition"
          style={{ color: '#1a1a1a' }}
        >
          PROFILE
        </Link>
        <button
          onClick={logout}
          className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition"
          style={{ color: '#1a1a1a' }}
        >
          LOG OUT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="font-mono text-[13px] uppercase tracking-tight hover:opacity-70 transition border px-3 py-1"
      style={{ color: '#1a1a1a', borderColor: '#1a1a1a' }}
    >
      LOG IN
    </button>
  );
}
