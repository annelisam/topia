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
  const profileOk = useRef(false); // cached once we know the profile is complete

  // 1. Sync the Privy user into our DB — once per login.
  useEffect(() => {
    if (!authenticated || !user) {
      syncedFor.current = null;
      profileOk.current = false;
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

  // 2. Send first-timers (no name/username) to onboarding — re-checked on every
  //    navigation. The event flow is exempt: RSVPing must not force profile
  //    creation. But once they leave events (e.g. land on the enter page) they
  //    get prompted. Onboarding/profile pages are exempt to avoid loops.
  useEffect(() => {
    if (!authenticated || !user) return;
    if (profileOk.current) return; // already complete — stop checking
    const exempt =
      pathname?.startsWith('/onboarding') ||
      pathname?.startsWith('/profile') ||
      pathname?.startsWith('/events');
    if (exempt) return;

    let cancelled = false;
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const complete = !!(d.user?.username && d.user?.name);
        if (complete) profileOk.current = true;
        else router.push('/onboarding');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authenticated, user, pathname, router]);

  return <AvatarMenu />;
}
