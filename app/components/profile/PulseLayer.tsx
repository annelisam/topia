'use client';

import { PathConfig } from './pathConfig';

type Availability = 'open' | 'busy' | 'by-request';

const AVAIL = {
  open: { color: '#00FF88', label: 'OPEN', dotClass: 'bg-green animate-pulse' },
  busy: { color: '#FFB800', label: 'BUSY', dotClass: 'bg-amber-400' },
  'by-request': { color: '#FF5C34', label: 'BY REQUEST', dotClass: 'bg-orange' },
} as const;

interface Props {
  config: PathConfig;
  availability?: Availability;
  lastDrop?: string;
  lastEvent?: string;
  lastCollab?: string;
}

export default function PulseLayer({ config, availability = 'open', lastDrop, lastEvent, lastCollab }: Props) {
  const avail = AVAIL[availability];
  const rows = [
    { label: 'last drop', value: lastDrop ?? 'None yet' },
    { label: 'last event', value: lastEvent ?? 'None yet' },
    { label: 'last collab', value: lastCollab ?? 'None yet' },
  ];

  return (
    <div className="relative bg-obsidian flex flex-col overflow-y-auto h-full" style={{ scrollbarWidth: 'thin' }}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />
      <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />

      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between relative z-10`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Pulse</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>topia://pulse</span>
      </div>

      <div className="flex items-center border-b border-bone/[0.04] relative z-10" style={{ minHeight: '48px' }}>
        <div className="w-[28px] shrink-0 flex items-center justify-center"><span className="font-mono text-[9px] text-bone/15">00</span></div>
        <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: avail.color }} />
        <div className="flex-1 px-3 py-3 flex items-center justify-between">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">availability</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${avail.dotClass}`} />
              <span className="font-mono text-[12px] text-bone/60 uppercase tracking-wider">{avail.label}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">status</span>
            <span className="font-mono text-[11px] text-bone/40 mt-0.5 block">Currently active</span>
          </div>
        </div>
      </div>

      {rows.map((row, i) => (
        <div key={row.label} className="flex items-center border-b border-bone/[0.04] relative z-10" style={{ minHeight: '48px' }}>
          <div className="w-[28px] shrink-0 flex items-center justify-center"><span className="font-mono text-[9px] text-bone/15">{String(i + 1).padStart(2, '0')}</span></div>
          <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: config.hex }} />
          <div className="flex-1 px-3 py-3 min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">{row.label}</span>
            <span className="font-mono text-[12px] text-bone/50 mt-0.5 block truncate">{row.value}</span>
          </div>
        </div>
      ))}

      <div className="px-4 py-3 flex items-center gap-3 relative z-10">
        <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${config.hex}30, ${config.hex}60, ${config.hex}30, transparent)` }} />
        <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/15">live feed</span>
      </div>
    </div>
  );
}
