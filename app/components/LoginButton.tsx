'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import AvatarMenu from './AvatarMenu';

export default function LoginButton() {
  const { authenticated, user } = usePrivy();

  // Sync user to our DB after login
  useEffect(() => {
    if (authenticated && user) {
      const email = user.email?.address
        ?? user.google?.email
        ?? user.linkedAccounts.find((a) => a.type === 'email')?.address
        ?? null;

      const phone = user.phone?.number ?? null;
      const walletAddress = user.wallet?.address ?? null;

      // Only sync auth identifiers — never overwrite profile fields the user may have set
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          email,
          phone,
          walletAddress,
        }),
      }).catch(console.error);
    }
  }, [authenticated, user]);

  return <AvatarMenu />;
}
