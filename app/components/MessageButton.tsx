'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

// Starts (or opens) a DM with the target user, then routes to the thread.
export default function MessageButton({ targetUserId, className }: { targetUserId: string; className?: string }) {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!authenticated || !user) { login(); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, targetUserId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) router.push(`/messages?c=${data.conversationId}`);
    } finally { setBusy(false); }
  };

  return (
    <button onClick={onClick} disabled={busy} className={className}>
      {busy ? '…' : 'Message'}
    </button>
  );
}
