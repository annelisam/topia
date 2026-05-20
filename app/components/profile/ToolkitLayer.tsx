'use client';

import Link from 'next/link';
import { PathConfig } from './pathConfig';
import { faviconUrl } from '../../resources/tools/favicon';

interface Tool {
  name: string;
  slug: string;
  category: string | null;
  url?: string | null;
}

interface Props {
  config: PathConfig;
  tools: Tool[];
}

export default function ToolkitLayer({ config, tools }: Props) {
  return (
    <div className="bg-obsidian flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Toolkit</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{tools.length} tools</span>
      </div>

      {tools.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/25">no tools declared yet</span>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {tools.map((t) => {
            const fav = faviconUrl(t.url ?? null, 64);
            return (
              <Link
                key={t.slug}
                href={`/resources/tools/${t.slug}`}
                className="flex items-center gap-3 border border-bone/10 hover:border-lime/40 hover:bg-bone/[0.03] px-3 py-2 rounded-sm transition no-underline"
                title={t.category ?? t.name}
              >
                <span className="w-8 h-8 shrink-0 rounded-sm border border-bone/10 bg-bone/[0.04] overflow-hidden flex items-center justify-center">
                  {fav ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={fav} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-basement text-sm text-bone/30">{t.name[0]?.toUpperCase()}</span>
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
  );
}
