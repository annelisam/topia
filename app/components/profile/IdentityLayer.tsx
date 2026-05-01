'use client';

import { PathConfig, COLOR_HEX } from './pathConfig';

interface ContentItem {
  name: string;
  sub: string;
  color: string;
  status: string;
}

interface Stamp {
  type: 'ENTRY' | 'EXIT' | 'TRANSIT';
  world: string;
  date: string;
  color: string;
  weight: number;
}

interface Props {
  config: PathConfig;
  sectionLabel: string;
  items: ContentItem[];
  stamps: Stamp[];
}

const STAMP_POSITIONS = [
  { x: 5, y: 0, rot: -6 },
  { x: 48, y: 2, rot: 8 },
  { x: 8, y: 30, rot: 4 },
  { x: 45, y: 28, rot: -10 },
  { x: 2, y: 58, rot: 6 },
  { x: 46, y: 62, rot: -4 },
];

export default function IdentityLayer({ config, sectionLabel, items, stamps }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-[3px] h-full">
      {/* Left — Endorsed list */}
      <div className="grid grid-rows-[auto_1fr] gap-[3px] overflow-hidden">
        <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
          <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>{sectionLabel}</span>
          <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{items.length} entries</span>
        </div>
        <div className="relative bg-obsidian overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)' }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(245,240,232,1) 47px, rgba(245,240,232,1) 48px)' }} />
          <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />
          <div className="relative z-10">
            {items.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No entries yet</span>
              </div>
            ) : items.map((item, i) => (
              <div key={item.name} className="flex items-center hover:bg-bone/[0.02] transition-colors cursor-pointer border-b border-bone/[0.04]" style={{ minHeight: '48px' }}>
                <div className="w-[28px] shrink-0 flex items-center justify-center"><span className="font-mono text-[9px] text-bone/15">{String(i + 1).padStart(2, '0')}</span></div>
                <div className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: COLOR_HEX[item.color] || '#f5f0e8' }} />
                <div className="flex-1 flex items-center justify-between gap-3 px-3 py-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[12px] uppercase font-bold text-bone block truncate">{item.name}</span>
                    <span className="font-mono text-[9px] text-bone/30">{item.sub}</span>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-bone/25 border border-bone/[0.08] rounded-sm px-2 py-0.5 shrink-0">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Visa stamps */}
      <div className="border-l border-bone/[0.04] bg-obsidian p-4 overflow-y-auto relative" style={{ scrollbarWidth: 'thin' }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.02]" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx="150" cy="200" rx={60 + i * 20} ry={40 + i * 15} fill="none" stroke="#f5f0e8" strokeWidth="0.4" transform={`rotate(${i * 12} 150 200)`} />
          ))}
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block mb-4 relative z-10">visa stamps // travel log</span>
        <div className="relative z-10 min-h-[280px]">
          {stamps.length === 0 ? (
            <div className="flex items-center justify-center pt-12">
              <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No travel yet</span>
            </div>
          ) : stamps.slice(0, 6).map((stamp, i) => {
            const pos = STAMP_POSITIONS[i] ?? { x: 0, y: 0, rot: 0 };
            const stampColor = COLOR_HEX[stamp.color] || config.hex;
            const size = 90 + (stamp.weight * 25);
            const isCircle = stamp.type === 'ENTRY' || stamp.type === 'TRANSIT';
            return (
              <div key={`${stamp.world}-${i}`} className="absolute group cursor-pointer transition-all duration-300 hover:z-30 hover:scale-110"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `rotate(${pos.rot}deg)`, opacity: stamp.weight, width: `${size}px`, height: isCircle ? `${size}px` : `${size * 0.55}px` }}>
                {isCircle ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="46" fill="none" stroke={stampColor} strokeWidth="2" opacity={0.4 + stamp.weight * 0.3} strokeDasharray={stamp.weight < 0.5 ? '3 2' : 'none'} />
                    <circle cx="50" cy="50" r="38" fill="none" stroke={stampColor} strokeWidth="0.8" opacity={0.25 + stamp.weight * 0.2} />
                    <defs>
                      <path id={`stampArc-${i}`} d="M 50,50 m -34,0 a 34,34 0 1,1 68,0" />
                      <path id={`stampArcBottom-${i}`} d="M 50,50 m 34,0 a 34,34 0 1,1 -68,0" />
                    </defs>
                    <text fill={stampColor} opacity={0.5 + stamp.weight * 0.3} style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
                      <textPath href={`#stampArc-${i}`} startOffset="50%" textAnchor="middle">{stamp.world}</textPath>
                    </text>
                    <text fill={stampColor} opacity={0.25 + stamp.weight * 0.15} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '3px', textTransform: 'uppercase' }}>
                      <textPath href={`#stampArcBottom-${i}`} startOffset="50%" textAnchor="middle">{`• ${stamp.type} • TOPIA •`}</textPath>
                    </text>
                    <text x="50" y="48" textAnchor="middle" fill={stampColor} opacity={0.6 + stamp.weight * 0.2} style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 'bold' }}>{stamp.date}</text>
                  </svg>
                ) : (
                  <svg viewBox="0 0 120 55" className="w-full h-full">
                    <rect x="2" y="2" width="116" height="51" rx="3" fill="none" stroke={stampColor} strokeWidth="2" opacity={0.35 + stamp.weight * 0.3} strokeDasharray={stamp.weight < 0.5 ? '4 2' : 'none'} />
                    <rect x="6" y="6" width="108" height="43" rx="1" fill="none" stroke={stampColor} strokeWidth="0.6" opacity={0.2 + stamp.weight * 0.15} />
                    <text x="60" y="18" textAnchor="middle" fill={stampColor} opacity={0.25 + stamp.weight * 0.2} style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '3px', textTransform: 'uppercase' }}>{stamp.type}</text>
                    <text x="60" y="32" textAnchor="middle" fill={stampColor} opacity={0.5 + stamp.weight * 0.3} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>{stamp.world}</text>
                    <text x="60" y="44" textAnchor="middle" fill={stampColor} opacity={0.25 + stamp.weight * 0.15} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px' }}>{stamp.date}</text>
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
