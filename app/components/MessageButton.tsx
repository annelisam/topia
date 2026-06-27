'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { openMessagesModal } from '../../lib/openMessages';

// Starts (or opens) a DM with the target user, then pops the Messages modal
// focused on that thread.
export default function MessageButton({ targetUserId, className }: { targetUserId: string; className?: string }) {
  const { authenticated, user, login } = usePrivy();
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
      if (res.ok && data.conversationId) openMessagesModal(data.conversationId);
    } finally { setBusy(false); }
  };

  return (
    <button onClick={onClick} disabled={busy} className={className}>
      {busy ? '…' : 'Message'}
    </button>
  );
}
