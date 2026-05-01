'use client';

import Link from 'next/link';
import { PathConfig, COLOR_HEX } from './pathConfig';

const STATUS_STYLE: Record<string, string> = {
  dormant: 'text-bone/25 border-bone/[0.08]',
  active: 'text-lime border-lime/20',
  live: 'text-pink border-pink/30',
  rising: 'text-blue border-blue/30',
};

interface WorldItem {
  worldId: string;
  worldTitle: string;
  worldSlug: string;
  worldImageUrl?: string | null;
  worldCategory?: string | null;
  role: string;
}

interface Props {
  config: PathConfig;
  isWorldBuilder: boolean;
  worlds: WorldItem[];
}

const COLORS = ['lime', 'blue', 'pink', 'orange', 'green'];

export default function WorldsLayer({ config, isWorldBuilder, worlds }: Props) {
  const sectionLabel = isWorldBuilder ? 'Your Worlds' : 'Visited Worlds';

  return (
    <div className="bg-obsidian flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>{sectionLabel}</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{worlds.length} worlds</span>
      </div>

      <div className="flex-1 flex items-center px-4 py-4 overflow-x-auto snap-x snap-mandatory gap-3" style={{ scrollbarWidth: 'thin' }}>
        {worlds.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[140px]">
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No worlds yet</span>
          </div>
        ) : (
          worlds.map((w, i) => {
            const colorKey = COLORS[i % COLORS.length];
            const status = w.role === 'owner' ? 'live' : w.role === 'world_builder' ? 'active' : 'rising';
            return (
              <Link key={w.worldId} href={`/worlds/${w.worldSlug}`} className="snap-start shrink-0 w-[200px] border border-bone/[0.06] rounded-sm p-4 hover:bg-bone/[0.02] transition-colors no-underline">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR_HEX[colorKey] || config.hex }} />
                  <span className="font-mono text-[12px] text-bone font-bold uppercase truncate">{w.worldTitle}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-mono text-[8px] uppercase tracking-wider border rounded-sm px-2 py-0.5 ${STATUS_STYLE[status] || STATUS_STYLE.dormant}`}>{status}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-bone/[0.04]">
                  <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25">role</span>
                  <span className="font-mono text-[11px] text-bone/60 font-bold uppercase">{w.role.replace('_', ' ')}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="px-4 pb-3 flex items-center gap-3">
        <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${config.hex}30, ${config.hex}60, ${config.hex}30, transparent)` }} />
        <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/15">scroll to explore</span>
      </div>
    </div>
  );
}
