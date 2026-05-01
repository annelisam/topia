'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import AvatarMenu from './AvatarMenu';

export default function LoginButton() {
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const syncedFor = useRef<string | null>(null);

  // Sync user to our DB after login, then route first-timers to /onboarding
  useEffect(() => {
    if (!authenticated || !user) return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    const email = user.email?.address
      ?? user.google?.email
      ?? user.linkedAccounts.find((a) => a.type === 'email')?.address
      ?? null;
    const phone = user.phone?.number ?? null;
    const walletAddress = user.wallet?.address ?? null;

    (async () => {
      try {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: user.id, email, phone, walletAddress }),
        });
        const json = await res.json();
        const synced = json?.user;
        // Don't redirect if user is already inside onboarding or actively on a profile-edit/related path
        const onProtectedPath = pathname?.startsWith('/onboarding') || pathname?.startsWith('/profile');
        if (synced && (!synced.username || !synced.name) && !onProtectedPath) {
          router.push('/onboarding');
        }
      } catch (err) {
        console.error('auth sync failed', err);
      }
    })();
  }, [authenticated, user, router, pathname]);

  return <AvatarMenu />;
}
