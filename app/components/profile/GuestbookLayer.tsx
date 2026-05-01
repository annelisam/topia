'use client';

import { PathConfig } from './pathConfig';

export interface GuestbookEntry {
  handle: string;
  message: string;
  timestamp: string;
}

interface Props {
  config: PathConfig;
  entries?: GuestbookEntry[];
}

export default function GuestbookLayer({ config, entries = [] }: Props) {
  return (
    <div className="relative bg-obsidian flex flex-col overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />
      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />

      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Guestbook</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{entries.length} notes</span>
      </div>

      <div className="relative z-10">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No notes yet — be the first</span>
          </div>
        ) : entries.map((entry, i) => (
          <div key={`${entry.handle}-${i}`} className="flex items-start border-b border-bone/[0.04] hover:bg-bone/[0.02] transition-colors" style={{ minHeight: '48px' }}>
            <div className="w-[28px] shrink-0 flex items-center justify-center pt-3"><span className="font-mono text-[9px] text-bone/15">{String(i + 1).padStart(2, '0')}</span></div>
            <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: config.hex }} />
            <div className="flex-1 px-3 py-3 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] text-bone/60 font-bold">{entry.handle}</span>
                <span className="font-mono text-[9px] text-bone/20">{entry.timestamp}</span>
              </div>
              <p className="font-zirkon text-[12px] text-bone/40 leading-relaxed">{entry.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 border-t border-bone/[0.06] px-4 py-3 flex items-center gap-3">
        <div className="w-[28px] shrink-0" />
        <div className="flex-1 flex items-center gap-2">
          <input type="text" placeholder="leave a note..." disabled className="flex-1 font-mono text-[11px] bg-transparent border border-bone/[0.06] text-bone/30 placeholder:text-bone/15 px-2.5 py-1.5 rounded-sm outline-none cursor-not-allowed" />
          <button disabled className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-bone/[0.06] text-bone/20 rounded-sm cursor-not-allowed">Send</button>
        </div>
      </div>
    </div>
  );
}
