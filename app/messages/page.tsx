'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '../components/Navigation';
import MessagesClient from './MessagesClient';

function FullMessages() {
  const c = useSearchParams().get('c');
  return <MessagesClient initialConversationId={c} />;
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
