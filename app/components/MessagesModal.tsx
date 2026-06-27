'use client';

import { useCallback, useEffect, useState } from 'react';
import MessagesClient from '../messages/MessagesClient';

// Global Messages popup — mounted only while open (by Navigation). Desktop: a
// roomy centered card that fades in. Mobile: a bottom sheet that slides up
// (mirrors RsvpModal) and slides back down on close.
//
// Keyboard handling (iOS Safari). With `interactive-widget=resizes-content`
// the browser shrinks the layout viewport when the keyboard opens, so the
// `items-end` dvh-sized sheet rides above the keyboard natively. The catch: a
// plain `inset-0` backdrop shrinks too, and on the FIRST keyboard open there's
// a lag frame where it's mis-sized and the bright page peeks through. Fix: size
// the backdrop in `lvh` (large-viewport height — the keyboard-*hidden* height,
// which never shrinks), so it always covers the full screen regardless of the
// keyboard. Worst case on a lag frame is the sheet settling a beat late — the
// backdrop is always covering, so the page can never show.
export default function MessagesModal({
  initialConversationId, onClose,
}: { initialConversationId?: string | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);

  // Animate in on mount + lock body scroll. Double rAF guarantees the browser
  // paints the off-screen (translate-y-full) state before we flip to
  // translate-y-0, so the bottom sheet actually slides up rather than just fading.
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setShown(true)); });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); document.body.style.overflow = prev; };
  }, []);

  // Animate out, then unmount.
  const requestClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  return (
    <>
      {/* Full-screen backdrop. Sized in lvh (keyboard-hidden height) so it stays
          full-screen even while the keyboard is open — nothing peeks through,
          even on the first-open lag frame. Tap to close. */}
      <div
        className={`fixed left-0 right-0 top-0 h-[100lvh] z-[2099] backdrop-blur-sm transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={requestClose}
      />
      {/* Positioning layer — the browser shrinks this with the keyboard
          (resizes-content), so items-end keeps the sheet above it. Click-through
          to the backdrop. */}
      <div className="fixed inset-0 z-[2100] flex items-end justify-center sm:items-center sm:p-4 overflow-hidden pointer-events-none">

        <div
          className={`pointer-events-auto relative w-full sm:max-w-[1000px] h-[88dvh] sm:h-[80vh] sm:max-h-[820px] rounded-t-3xl sm:rounded-2xl border-0 sm:border border-ink/[0.12] flex flex-col overflow-hidden bg-[var(--page-bg)] text-ink shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)] transition-[translate,opacity] duration-300 ease-out opacity-100 ${shown ? 'translate-y-0 sm:opacity-100' : 'translate-y-full sm:translate-y-2 sm:opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 border-b border-ink/[0.08]">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/55">Messages</span>
          <button onClick={requestClose} aria-label="Close" className="flex items-center justify-center text-ink/45 hover:text-ink p-1.5 bg-transparent border-none cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <MessagesClient initialConversationId={initialConversationId} />
        </div>
      </div>
    </>
  );
}
