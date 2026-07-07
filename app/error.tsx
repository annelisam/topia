'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--page-bg)', color: 'var(--page-text)' }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[3px] opacity-60 mb-4">error // signal lost</p>
      <h1 className="font-basement font-black text-[clamp(32px,7vw,72px)] uppercase leading-[0.9] mb-6">
        Something went wrong
      </h1>
      <p className="font-mono text-[12px] uppercase tracking-[2px] opacity-60 mb-10 max-w-md">
        It&apos;s us, not you. Try again — if it keeps happening, come back in a minute.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="font-mono text-[11px] uppercase tracking-[2px] px-5 py-3 rounded-sm bg-lime text-obsidian font-bold border-none cursor-pointer hover:opacity-80 transition"
        >
          Try again
        </button>
        <Link
          href="/home"
          className="font-mono text-[11px] uppercase tracking-[2px] px-5 py-3 rounded-sm border border-current no-underline opacity-70 hover:opacity-100 transition"
          style={{ color: 'var(--page-text)' }}
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
