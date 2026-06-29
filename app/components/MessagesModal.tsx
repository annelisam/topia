'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MessagesClient from '../messages/MessagesClient';
import { useKeyboardViewport } from '../hooks/useKeyboardViewport';

// Global Messages UI — mounted only while open (by Navigation).
//
// Mobile (<640px): full-screen takeover. Fixed inset-0, solid background, no
// backdrop, no bottom-sheet scroll issues. The page is completely hidden behind
// it so there's nothing to scroll. Keyboard handling via useKeyboardViewport
// still applies so the composer sits flush on the keyboard.
//
// Desktop (≥640px): centered card with backdrop blur, same as before.
export default function MessagesModal({
  initialConversationId, onClose,
}: { initialConversationId?: string | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const mobileLayerRef = useRef<HTMLDivElement>(null);
  const desktopPositionerRef = useRef<HTMLDivElement>(null);
  useKeyboardViewport(mobileLayerRef);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setShown(true)); });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); document.body.style.overflow = prev; };
  }, []);

  const requestClose = useCallback(() => {
    setShown(false);
    setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const topBar = (
    <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 border-b border-ink/[0.08]">
      <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/55">Messages</span>
      <button onClick={requestClose} aria-label="Close" className="flex items-center justify-center text-ink/45 hover:text-ink w-8 h-8 rounded-full active:bg-ink/10 bg-transparent border-none cursor-pointer transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );

  return (
    <>
      {/* ── Mobile: full-screen page takeover ── */}
      <div
        ref={mobileLayerRef}
        className={`fixed inset-0 z-[2100] flex flex-col bg-[var(--page-bg)] text-ink sm:hidden transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
      >
        {topBar}
        <MessagesClient initialConversationId={initialConversationId} />
      </div>

      {/* ── Desktop: backdrop + centered card ── */}
      <div
        className={`hidden sm:block fixed inset-0 z-[2099] backdrop-blur-md transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
        onClick={requestClose}
      />
      <div
        ref={desktopPositionerRef}
        className="hidden sm:flex fixed inset-0 z-[2100] items-center justify-center p-4 overflow-hidden pointer-events-none"
      >
        <div
          className={`pointer-events-auto relative max-w-[1000px] w-full h-[80vh] max-h-[820px] rounded-2xl border border-ink/[0.12] flex flex-col overflow-hidden bg-[var(--page-bg)] text-ink shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)] transition-[translate,opacity] duration-300 ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {topBar}
          <MessagesClient initialConversationId={initialConversationId} />
        </div>
      </div>
    </>
  );
}
