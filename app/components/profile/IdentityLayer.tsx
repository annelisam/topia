'use client';

import { PathConfig, COLOR_HEX } from './pathConfig';

interface ContentItem {
  name: string;
  sub: string;
  color: string;
  status: string;
}

export type StampRarity = 'common' | 'rare' | 'legendary';

export interface Stamp {
  label: string;             // center / top-arc word (event or world name, etc.)
  caption: string;           // the stamp "type" word (FOUNDER, CHECK-IN, …)
  date: string;
  color: string;
  shape: 'circle' | 'rect' | 'seal';
  rarity: StampRarity;
  weight: number;
  emblem?: 'topia' | 'star';
}

interface Props {
  config: PathConfig;
  sectionLabel: string;
  items: ContentItem[];
  stamps: Stamp[];
  /** When false, only the visa stamps show (full-width); endorsed list hidden. */
  showEndorsed?: boolean;
}

// Layered horizontal band — stamps overlap left→right and the strip scrolls
// sideways as more are earned, so the section stays short.
const BAND_H = 152;           // px — fixed height of the stamp strip
const STEP = 72;              // px advance per stamp (< stamp width → overlap)
const YJIT = [-8, 8, -4, 10, -10, 4, -6, 6, -9, 7, -3, 9];
const ROT = [-7, 6, -4, 8, -6, 5, -8, 4, -5, 7, -3, 6];
// TOPIA mark — a 4-point sparkle star for the members' seal.
const TOPIA_STAR = 'M50 30 L55 45 L70 50 L55 55 L50 70 L45 55 L30 50 L45 45 Z';

export default function IdentityLayer({ config, sectionLabel, items, stamps, showEndorsed = true }: Props) {
  return (
    <div className={`grid grid-cols-1 ${showEndorsed ? 'md:grid-cols-[2fr_3fr]' : ''} gap-[3px] h-full`}>
      {/* Left — Endorsed list */}
      {showEndorsed && (
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
      )}

      {/* Right — Visa stamps (layered horizontal strip) */}
      <div className={`${showEndorsed ? 'border-l border-bone/[0.04]' : ''} bg-obsidian p-4 relative overflow-hidden`}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.02]" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx="150" cy="200" rx={60 + i * 20} ry={40 + i * 15} fill="none" stroke="#f5f0e8" strokeWidth="0.4" transform={`rotate(${i * 12} 150 200)`} />
          ))}
        </svg>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25">visa stamps // travel log</span>
          {stamps.length > 0 && <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/20">{stamps.length} earned</span>}
        </div>
        {stamps.length === 0 ? (
          <div className="flex items-center justify-center relative z-10" style={{ height: BAND_H }}>
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No travel yet</span>
          </div>
        ) : (
          <div className="relative z-10 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'thin' }}>
            <div className="relative" style={{ height: BAND_H, width: (stamps.length - 1) * STEP + 132 }}>
              {stamps.map((stamp, i) => {
                const stampColor = COLOR_HEX[stamp.color] || config.hex;
                const size = 104 + stamp.weight * 24;
                const isRect = stamp.shape === 'rect';
                const stampH = isRect ? size * 0.56 : size;
                const isRare = stamp.rarity !== 'common';
                const isLegend = stamp.rarity === 'legendary';
                const ringOp = 0.7 + stamp.weight * 0.3;
                const top = (BAND_H - stampH) / 2 + YJIT[i % YJIT.length];
                return (
                  <div key={i} title={`${stamp.caption} · ${stamp.label}`} className="absolute group cursor-pointer transition-transform duration-300 hover:!z-50 hover:scale-[1.12]"
                    style={{ left: `${i * STEP}px`, top: `${top}px`, transform: `rotate(${ROT[i % ROT.length]}deg)`, width: `${size}px`, height: `${stampH}px`, zIndex: i + 1 }}>
                    {stamp.shape === 'seal' ? (
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="48" fill="#0e0e0e" opacity={0.55} />
                        <circle cx="50" cy="50" r="47" fill="none" stroke={stampColor} strokeWidth="3" opacity={ringOp} />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={stampColor} strokeWidth="1" opacity={ringOp * 0.75} />
                        <circle cx="50" cy="50" r="44.5" fill="none" stroke={stampColor} strokeWidth="1.4" opacity={ringOp * 0.7} strokeDasharray="0.4 2.6" />
                        <defs>
                          <path id={`sealTop-${i}`} d="M 50,50 m -33,0 a 33,33 0 1,1 66,0" />
                          <path id={`sealBot-${i}`} d="M 50,50 m 33,0 a 33,33 0 1,1 -66,0" />
                        </defs>
                        <text fill={stampColor} opacity={0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          <textPath href={`#sealTop-${i}`} startOffset="50%" textAnchor="middle">{stamp.label}</textPath>
                        </text>
                        <text fill={stampColor} opacity={0.75} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                          <textPath href={`#sealBot-${i}`} startOffset="50%" textAnchor="middle">{`• ${stamp.caption} •`}</textPath>
                        </text>
                        {stamp.emblem === 'topia' ? (
                          <path d={TOPIA_STAR} fill={stampColor} opacity={0.95} />
                        ) : (
                          <path d={TOPIA_STAR} fill="none" stroke={stampColor} strokeWidth="2.4" opacity={0.9} transform="translate(15 15) scale(0.7)" />
                        )}
                      </svg>
                    ) : isRect ? (
                      <svg viewBox="0 0 120 55" className="w-full h-full">
                        {isLegend && <rect x="2" y="2" width="116" height="51" rx="3" fill={stampColor} opacity={0.1} />}
                        {isRare && <rect x="0.5" y="0.5" width="119" height="54" rx="4" fill="none" stroke={stampColor} strokeWidth="0.7" opacity={ringOp * 0.65} strokeDasharray="1 4" />}
                        <rect x="2" y="2" width="116" height="51" rx="3" fill="none" stroke={stampColor} strokeWidth={isRare ? 2.6 : 2.2} opacity={ringOp} />
                        <rect x="6" y="6" width="108" height="43" rx="1" fill="none" stroke={stampColor} strokeWidth="0.7" opacity={ringOp * 0.6} />
                        <text x="60" y="18" textAnchor="middle" fill={stampColor} opacity={0.7} style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '3px', textTransform: 'uppercase' }}>{stamp.caption}</text>
                        <text x="60" y="32" textAnchor="middle" fill={stampColor} opacity={0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>{stamp.label}</text>
                        <text x="60" y="44" textAnchor="middle" fill={stampColor} opacity={0.6} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px' }}>{stamp.date}</text>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {isLegend && <circle cx="50" cy="50" r="46" fill={stampColor} opacity={0.1} />}
                        {isRare && <circle cx="50" cy="50" r="49" fill="none" stroke={stampColor} strokeWidth="0.7" opacity={ringOp * 0.65} strokeDasharray="1 4" />}
                        <circle cx="50" cy="50" r="46" fill="none" stroke={stampColor} strokeWidth={isRare ? 2.8 : 2.2} opacity={ringOp} />
                        <circle cx="50" cy="50" r="38" fill="none" stroke={stampColor} strokeWidth="0.9" opacity={ringOp * 0.65} />
                        {isLegend && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
                          const rad = (a * Math.PI) / 180;
                          return <circle key={a} cx={50 + Math.cos(rad) * 49} cy={50 + Math.sin(rad) * 49} r="1.3" fill={stampColor} opacity={0.85} />;
                        })}
                        <defs>
                          <path id={`stampArc-${i}`} d="M 50,50 m -34,0 a 34,34 0 1,1 68,0" />
                          <path id={`stampArcBottom-${i}`} d="M 50,50 m 34,0 a 34,34 0 1,1 -68,0" />
                        </defs>
                        <text fill={stampColor} opacity={0.9} style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
                          <textPath href={`#stampArc-${i}`} startOffset="50%" textAnchor="middle">{stamp.label}</textPath>
                        </text>
                        <text fill={stampColor} opacity={0.55} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                          <textPath href={`#stampArcBottom-${i}`} startOffset="50%" textAnchor="middle">{`• ${stamp.caption} • TOPIA •`}</textPath>
                        </text>
                        <text x="50" y="48" textAnchor="middle" fill={stampColor} opacity={0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 'bold' }}>{stamp.date}</text>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
