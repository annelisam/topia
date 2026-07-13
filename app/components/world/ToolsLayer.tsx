'use client';

import Link from 'next/link';
import ToolMiniCard, { type ToolMiniData } from '../../resources/tools/ToolMiniCard';
import { WorldConfig } from './worldConfig';

// World tools are free-text names typed by builders; the directory has names
// AND slugs. Compare on lowercase alphanumerics only so "Max/MSP" finds
// "max-msp" and "Base App" finds "base-app" instead of falling to dead chips.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function ToolsLayer({
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
  const findTool = (name: string) => allTools.find((t) => norm(t.name) === norm(name) || norm(t.slug) === norm(name));
  const matched = toolNames.map(findTool).filter((t): t is ToolMiniData => Boolean(t));
  const unmatchedNames = toolNames.filter((name) => !findTool(name));

  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
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
          {/* No onOpen — the card falls back to a direct link to the tool's page */}
          {matched.map((tool) => <ToolMiniCard key={tool.slug} tool={tool} />)}
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
    </div>
  );
}
