'use client';

import Link from 'next/link';
import { faviconUrl } from '../../resources/tools/favicon';
import { StarIcon } from '../../components/ui/Icons';
import { useOverview } from './DashboardOverviewContext';

export default function SavedToolsWidget() {
  const { data, loading } = useOverview();

  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden bg-obsidian">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 flex items-center gap-2">
          <span className="text-lime/80"><StarIcon size={11} filled /></span>
          Saved tools{data && data.savedTools.length > 0 && <span className="text-bone/30">· {data.savedTools.length}</span>}
        </span>
        <Link
          href="/resources/tools"
          className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone transition no-underline"
        >
          browse all →
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
        ) : data.savedTools.length === 0 ? (
          <p className="font-mono text-[11px] text-bone/40 leading-relaxed">
            Click <StarIcon size={10} filled={false} className="inline align-middle" /> on any tool in{' '}
            <Link href="/resources/tools" className="text-lime underline">/resources/tools</Link>{' '}
            to save it here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.savedTools.slice(0, 8).map((t) => {
              const fav = faviconUrl(t.url, 32);
              return (
                <Link
                  key={t.id}
                  href={`/resources/tools/${t.slug}`}
                  className="flex items-center gap-3 border border-bone/10 hover:border-lime/40 hover:bg-bone/[0.03] rounded-sm px-3 py-2 transition no-underline"
                >
                  <span className="w-7 h-7 rounded-sm border border-bone/10 bg-bone/[0.04] overflow-hidden flex items-center justify-center shrink-0">
                    {fav ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={fav} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-basement text-[11px] text-bone/30">{t.name[0]?.toUpperCase()}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{t.name}</div>
                    {t.category && <div className="font-mono text-[10px] text-bone/30 truncate">{t.category}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
