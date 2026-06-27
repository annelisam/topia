'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';
import MessagesClient from './MessagesClient';

function FullMessages() {
  const c = useSearchParams().get('c');
  const router = useRouter();
  // Return to wherever they came from (e.g. the modal's "open in full size"),
  // falling back to home when there's no history to pop.
  const close = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 h-12 shrink-0 border-b border-ink/[0.08]">
        <h1 className="font-basement font-black text-[16px] uppercase text-ink leading-none">Messages</h1>
        <button onClick={close} aria-label="Close" title="Close" className="flex items-center justify-center text-ink/45 hover:text-ink p-1.5 bg-transparent border-none cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
      <MessagesClient initialConversationId={c} />
    </div>
  );
}

// Full-height chat surface — renders the nav directly (no footer) so the inbox +
// thread fill the viewport below the desktop top nav.
export default function MessagesPage() {
  return (
    <>
      <Navigation />
      <main className="md:pt-[var(--nav-height)] bg-[var(--page-bg)] text-ink">
        <div className="flex flex-col h-[100dvh] md:h-[calc(100dvh-var(--nav-height))]">
          <Suspense fallback={<div className="flex-1" />}>
            <FullMessages />
          </Suspense>
        </div>
      </main>
    </>
  );
}
