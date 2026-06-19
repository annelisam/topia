'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useRef } from 'react';
import AvatarMenu from './AvatarMenu';

export default function LoginButton() {
  const { authenticated, user } = usePrivy();
  const syncedFor = useRef<string | null>(null);

  // Sync the Privy user into our DB — once per login. Onboarding is optional;
  // we never auto-redirect users into it.
  useEffect(() => {
    if (!authenticated || !user) {
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    const email = user.email?.address
      ?? user.google?.email
      ?? user.linkedAccounts.find((a) => a.type === 'email')?.address
      ?? null;
    const phone = user.phone?.number ?? null;
    const walletAddress = user.wallet?.address ?? null;

    fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId: user.id, email, phone, walletAddress }),
    }).catch((err) => console.error('auth sync failed', err));
  }, [authenticated, user]);

  return <AvatarMenu />;
}
