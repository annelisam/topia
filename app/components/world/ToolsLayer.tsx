'use client';

import Link from 'next/link';
import { WorldConfig } from './worldConfig';

export default function ToolsLayer({
  config,
  tools,
  canEdit,
  editHref,
}: {
  config: WorldConfig;
  tools: string[];
  canEdit: boolean;
  editHref: string;
}) {
  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Tools</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>{tools.length} {tools.length === 1 ? 'tool' : 'tools'}</span>
      </div>

      {tools.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
          <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No tools listed yet</span>
          {canEdit && (
            <Link href={editHref} className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/70 transition-colors border border-ink/[0.12] rounded-sm px-2.5 py-1 no-underline">
              + Add a tool
            </Link>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {tools.map((tool) => (
              <div key={tool} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-ink/[0.08] bg-[var(--page-bg)]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: config.hex }} />
                <span className="font-mono text-[12px] text-ink/70 truncate">{tool}</span>
              </div>
            ))}
            {canEdit && (
              <Link
                href={editHref}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-ink/20 text-ink/40 hover:text-ink/60 hover:border-ink/35 transition-colors no-underline"
              >
                <span className="font-mono text-[14px] leading-none">+</span>
                <span className="font-mono text-[11px] uppercase tracking-wider">Add tool</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
