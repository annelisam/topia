'use client';

import Link from 'next/link';
import { useState } from 'react';
import { StarIcon } from '../../components/ui/Icons';
import { useOverview } from './DashboardOverviewContext';
import ToolMiniCard from '../../resources/tools/ToolMiniCard';
import ToolModal from '../../resources/tools/ToolModal';

export default function SavedToolsWidget() {
  const { data, loading } = useOverview();
  const [modalSlug, setModalSlug] = useState<string | null>(null);

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 flex items-center gap-2">
          <span className="text-lime/80"><StarIcon size={11} filled /></span>
          Saved tools{data && data.savedTools.length > 0 && <span className="text-ink/30">· {data.savedTools.length}</span>}
        </span>
        <Link
          href="/resources/tools"
          className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink transition no-underline"
        >
          browse all →
        </Link>
      </div>

      <div className="bg-[var(--page-bg)] p-4">
        {loading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border border-ink/10 rounded-sm px-3 py-2">
                <div className="w-7 h-7 rounded-sm bg-ink/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-ink/[0.06] rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-ink/[0.04] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : data.savedTools.length === 0 ? (
          <p className="font-mono text-[11px] text-ink/40 leading-relaxed">
            Click <StarIcon size={10} filled={false} className="inline align-middle" /> on any tool in{' '}
            <Link href="/resources/tools" className="text-lime underline">/resources/tools</Link>{' '}
            to save it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.savedTools.slice(0, 8).map((t) => (
              <ToolMiniCard key={t.id} tool={t} onOpen={setModalSlug} />
            ))}
          </div>
        )}
      </div>

      <ToolModal slug={modalSlug} onClose={() => setModalSlug(null)} />
    </div>
  );
}
