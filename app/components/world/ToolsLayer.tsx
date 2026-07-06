'use client';

import { useState } from 'react';
import Link from 'next/link';
import ToolMiniCard, { type ToolMiniData } from '../../resources/tools/ToolMiniCard';
import ToolModal from '../../resources/tools/ToolModal';
import { WorldConfig } from './worldConfig';

export default function ToolsLayer({
  config,
  toolNames,
  allTools,
  canEdit,
  editHref,
}: {
  config: WorldConfig;
  toolNames: string[];
  allTools: ToolMiniData[];
  canEdit: boolean;
  editHref: string;
}) {
  const [modalSlug, setModalSlug] = useState<string | null>(null);

  const matched = toolNames
    .map((name) => allTools.find((t) => t.name.toLowerCase() === name.toLowerCase()))
    .filter((t): t is ToolMiniData => Boolean(t));
  const unmatchedNames = toolNames.filter((name) => !allTools.some((t) => t.name.toLowerCase() === name.toLowerCase()));

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Tools</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>{toolNames.length} {toolNames.length === 1 ? 'tool' : 'tools'}</span>
      </div>

      {toolNames.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
          <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No tools listed yet</span>
          {canEdit && (
            <Link href={editHref} className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/70 transition-colors border border-ink/[0.12] rounded-sm px-2.5 py-1 no-underline">
              + Add a tool
            </Link>
          )}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {matched.map((tool) => <ToolMiniCard key={tool.slug} tool={tool} onOpen={setModalSlug} />)}
          {unmatchedNames.map((name) => (
            <div key={name} className="flex items-center gap-3 border border-ink/10 rounded-sm px-3 py-2">
              <span className="w-9 h-9 shrink-0 rounded-sm border border-ink/10 bg-ink/[0.04] flex items-center justify-center font-mono text-[12px] text-ink/30">{name[0]?.toUpperCase()}</span>
              <span className="font-mono text-[12px] uppercase font-bold text-ink/70 truncate">{name}</span>
            </div>
          ))}
          {canEdit && (
            <Link
              href={editHref}
              className="flex items-center justify-center gap-1.5 border border-dashed border-ink/20 rounded-sm px-3 py-2 text-ink/40 hover:text-ink/60 hover:border-ink/35 transition-colors no-underline"
            >
              <span className="font-mono text-[14px] leading-none">+</span>
              <span className="font-mono text-[11px] uppercase tracking-wider">Add tool</span>
            </Link>
          )}
        </div>
      )}

      <ToolModal slug={modalSlug} onClose={() => setModalSlug(null)} />
    </div>
  );
}
