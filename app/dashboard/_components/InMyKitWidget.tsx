'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useOverview } from './DashboardOverviewContext';
import ToolMiniCard from '../../resources/tools/ToolMiniCard';
import ToolModal from '../../resources/tools/ToolModal';

/**
 * "In my kit" — tools the user has marked "I use this" on /resources/tools.
 * Different from SavedToolsWidget (which is the bookmark list). This is the
 * declared-toolkit that also shows up on their public profile.
 */
export default function InMyKitWidget() {
  const { data, loading } = useOverview();
  const [modalSlug, setModalSlug] = useState<string | null>(null);

  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden bg-obsidian">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 flex items-center gap-2">
          <span className="text-lime/80">◆</span>
          In my kit{data && data.kitTools.length > 0 && <span className="text-bone/30">· {data.kitTools.length}</span>}
        </span>
        <Link
          href="/resources/tools"
          className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone transition no-underline"
        >
          add more →
        </Link>
      </div>

      <div className="bg-obsidian p-4">
        {loading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border border-bone/10 rounded-sm px-3 py-2">
                <div className="w-7 h-7 rounded-sm bg-bone/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-bone/[0.06] rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-bone/[0.04] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : data.kitTools.length === 0 ? (
          <p className="font-mono text-[11px] text-bone/40 leading-relaxed">
            Declare the tools you actually use — hit{' '}
            <span className="text-bone">+ I use this</span> on any tool at{' '}
            <Link href="/resources/tools" className="text-lime underline">/resources/tools</Link>.
            They&apos;ll show up here and on your public toolkit.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.kitTools.slice(0, 8).map((t) => (
              <ToolMiniCard key={t.id} tool={t} onOpen={setModalSlug} />
            ))}
          </div>
        )}
      </div>

      <ToolModal slug={modalSlug} onClose={() => setModalSlug(null)} />
    </div>
  );
}
