'use client';

import { useEffect } from 'react';
import MessagesClient from '../messages/MessagesClient';

// Global Messages popup. Desktop: centered card. Mobile: bottom sheet (slide-up,
// mirrors RsvpModal). The expand control inside the header links to /messages.
export default function MessagesModal({
  open, initialConversationId, onClose,
}: { open: boolean; initialConversationId?: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center sm:items-center sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl h-[88dvh] sm:h-[640px] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl border-0 sm:border border-ink/[0.12] flex flex-col overflow-hidden bg-[var(--page-bg)] text-ink shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        <MessagesClient initialConversationId={initialConversationId} onClose={onClose} fullViewHref="/messages" />
      </div>
    </div>
  );
}
