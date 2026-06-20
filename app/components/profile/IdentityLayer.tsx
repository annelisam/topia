'use client';

import { useState } from 'react';
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
  title: string;
  description: string;
}

interface Props {
  config: PathConfig;
  sectionLabel: string;
  items: ContentItem[];
  stamps: Stamp[];
  /** When false, only the visa stamps show (full-width); endorsed list hidden. */
  showEndorsed?: boolean;
}

// Random-looking scatter — stamps sit at varied heights & angles in a short
// band, lightly overlapping like a real passport page. Scrolls sideways.
const BAND_H = 150;
const STEP = 84;            // px advance per stamp
// Deterministic pseudo-random in [0,1) — stable across SSR/CSR (Math.random
// would cause a hydration mismatch; Math.sin of a constant won't).
function rng(n: number): number { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
// 4-point sparkle star fallback emblem (path seals).
const STAR = 'M50 30 L55 45 L70 50 L55 55 L50 70 L45 55 L30 50 L45 45 Z';

// Muted "ink" versions of the brand colors — desaturated so stamps read like
// faded passport ink instead of neon. Silver (the TOPIA seal) is left vivid.
const STAMP_INK: Record<string, string> = {
  lime: '#a7b06a',
  blue: '#8786bd',
  pink: '#bd83ac',
  orange: '#c5816a',
  green: '#67a78b',
};
function inkColor(color: string, fallback: string): string {
  if (color === 'silver') return COLOR_HEX.silver;
  return STAMP_INK[color] || COLOR_HEX[color] || fallback;
}

// One stamp's SVG — reused in the strip and the detail modal.
function StampSvg({ stamp, idKey, config }: { stamp: Stamp; idKey: string; config: PathConfig }) {
  const c = inkColor(stamp.color, config.hex);
  const isRect = stamp.shape === 'rect';
  const isRare = stamp.rarity !== 'common';
  const isLegend = stamp.rarity === 'legendary';
  const ringOp = 0.7 + stamp.weight * 0.3;

  if (stamp.shape === 'seal') {
    const topia = stamp.emblem === 'topia';
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full" shapeRendering="geometricPrecision">
        <defs>
          <path id={`sealTop-${idKey}`} d="M 50,50 m -33,0 a 33,33 0 1,1 66,0" />
          <path id={`sealBot-${idKey}`} d="M 50,50 m 33,0 a 33,33 0 1,1 -66,0" />
          {topia && (
            <>
              <linearGradient id={`chrome-${idKey}`} x1="0" y1="0" x2="0.9" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="22%" stopColor="#c4cad6" />
                <stop offset="46%" stopColor="#878d9c" />
                <stop offset="60%" stopColor="#dde1ea" />
                <stop offset="80%" stopColor="#9aa0af" />
                <stop offset="100%" stopColor="#f4f6fb" />
              </linearGradient>
              <linearGradient id={`holo-${idKey}`} x1="0" y1="0" x2="1" y2="0.35">
                <stop offset="0%" stopColor="#b9a8ff" />
                <stop offset="25%" stopColor="#9fe0ff" />
                <stop offset="50%" stopColor="#a6ffcf" />
                <stop offset="75%" stopColor="#fff2a6" />
                <stop offset="100%" stopColor="#ffaedb" />
              </linearGradient>
              <radialGradient id={`holoGlow-${idKey}`} cx="0.5" cy="0.45" r="0.55">
                <stop offset="0%" stopColor="#a6ffe0" stopOpacity="0.32" />
                <stop offset="55%" stopColor="#b9a8ff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>
            </>
          )}
        </defs>
        <circle cx="50" cy="50" r="48" fill="#0c0c0e" opacity={topia ? 0.72 : 0.55} />
        {topia ? (
          <>
            <circle cx="50" cy="50" r="41" fill={`url(#holoGlow-${idKey})`} />
            <circle cx="50" cy="50" r="47.6" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity={0.5} />
            <circle cx="50" cy="50" r="46.5" fill="none" stroke={`url(#chrome-${idKey})`} strokeWidth="3.4" />
            <circle cx="50" cy="50" r="42.4" fill="none" stroke={`url(#chrome-${idKey})`} strokeWidth="1.2" opacity={0.85} />
            <circle cx="50" cy="50" r="44.6" fill="none" stroke={`url(#holo-${idKey})`} strokeWidth="2" opacity={0.6} strokeDasharray="0.6 2.3" />
          </>
        ) : (
          <>
            <circle cx="50" cy="50" r="47" fill="none" stroke={c} strokeWidth="3" opacity={ringOp} />
            <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="1" opacity={ringOp * 0.75} />
            <circle cx="50" cy="50" r="44.5" fill="none" stroke={c} strokeWidth="1.4" opacity={ringOp * 0.7} strokeDasharray="0.4 2.6" />
          </>
        )}
        <text fill={topia ? `url(#chrome-${idKey})` : c} opacity={topia ? 1 : 0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
          <textPath href={`#sealTop-${idKey}`} startOffset="50%" textAnchor="middle">{stamp.label}</textPath>
        </text>
        <text fill={topia ? `url(#chrome-${idKey})` : c} opacity={topia ? 0.92 : 0.75} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
          <textPath href={`#sealBot-${idKey}`} startOffset="50%" textAnchor="middle">{`• ${stamp.caption} •`}</textPath>
        </text>
        {topia ? (
          // eslint-disable-next-line @next/next/no-img-element
          <image href="/brand/topia-mark.png" x="18.5" y="29" width="63" height="42" preserveAspectRatio="xMidYMid meet" opacity={1} />
        ) : (
          <path d={STAR} fill="none" stroke={c} strokeWidth="2.4" opacity={0.9} transform="translate(15 15) scale(0.7)" />
        )}
      </svg>
    );
  }

  if (isRect) {
    return (
      <svg viewBox="0 0 120 55" className="w-full h-full">
        {isLegend && <rect x="2" y="2" width="116" height="51" rx="3" fill={c} opacity={0.1} />}
        {isRare && <rect x="0.5" y="0.5" width="119" height="54" rx="4" fill="none" stroke={c} strokeWidth="0.7" opacity={ringOp * 0.65} strokeDasharray="1 4" />}
        <rect x="2" y="2" width="116" height="51" rx="3" fill="none" stroke={c} strokeWidth={isRare ? 2.6 : 2.2} opacity={ringOp} />
        <rect x="6" y="6" width="108" height="43" rx="1" fill="none" stroke={c} strokeWidth="0.7" opacity={ringOp * 0.6} />
        <text x="60" y="18" textAnchor="middle" fill={c} opacity={0.7} style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '3px', textTransform: 'uppercase' }}>{stamp.caption}</text>
        <text x="60" y="32" textAnchor="middle" fill={c} opacity={0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>{stamp.label}</text>
        <text x="60" y="44" textAnchor="middle" fill={c} opacity={0.6} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px' }}>{stamp.date}</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {isLegend && <circle cx="50" cy="50" r="46" fill={c} opacity={0.1} />}
      {isRare && <circle cx="50" cy="50" r="49" fill="none" stroke={c} strokeWidth="0.7" opacity={ringOp * 0.65} strokeDasharray="1 4" />}
      <circle cx="50" cy="50" r="46" fill="none" stroke={c} strokeWidth={isRare ? 2.8 : 2.2} opacity={ringOp} />
      <circle cx="50" cy="50" r="38" fill="none" stroke={c} strokeWidth="0.9" opacity={ringOp * 0.65} />
      {isLegend && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return <circle key={a} cx={50 + Math.cos(rad) * 49} cy={50 + Math.sin(rad) * 49} r="1.3" fill={c} opacity={0.85} />;
      })}
      <defs>
        <path id={`arcTop-${idKey}`} d="M 50,50 m -34,0 a 34,34 0 1,1 68,0" />
        <path id={`arcBot-${idKey}`} d="M 50,50 m 34,0 a 34,34 0 1,1 -68,0" />
      </defs>
      <text fill={c} opacity={0.9} style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
        <textPath href={`#arcTop-${idKey}`} startOffset="50%" textAnchor="middle">{stamp.label}</textPath>
      </text>
      <text fill={c} opacity={0.55} style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '2.5px', textTransform: 'uppercase' }}>
        <textPath href={`#arcBot-${idKey}`} startOffset="50%" textAnchor="middle">{`• ${stamp.caption} • TOPIA •`}</textPath>
      </text>
      <text x="50" y="48" textAnchor="middle" fill={c} opacity={0.95} style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 'bold' }}>{stamp.date}</text>
    </svg>
  );
}

export default function IdentityLayer({ config, sectionLabel, items, stamps, showEndorsed = true }: Props) {
  const [selected, setSelected] = useState<Stamp | null>(null);
  const selColor = selected ? inkColor(selected.color, config.hex) : config.hex;
  const selRectShape = selected?.shape === 'rect';

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

      {/* Right — Visa stamps (organic scatter, scrolls sideways) */}
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
            <div className="relative" style={{ height: BAND_H, width: (stamps.length - 1) * STEP + 130 }}>
              {stamps.map((stamp, i) => {
                const size = 84 + stamp.weight * 18;
                const isRect = stamp.shape === 'rect';
                const stampH = isRect ? size * 0.56 : size;
                const jx = (rng(i * 2 + 1) - 0.5) * 30;
                const top = rng(i * 2 + 9) * (BAND_H - stampH);
                const rot = (rng(i * 3 + 4) - 0.5) * 28;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(stamp)}
                    title={`${stamp.title} — ${stamp.date}`}
                    className="absolute group cursor-pointer transition-transform duration-300 hover:!z-[60] hover:scale-[1.14] bg-transparent border-none p-0"
                    style={{ left: `${i * STEP + jx}px`, top: `${top}px`, transform: `rotate(${rot}deg)`, width: `${size}px`, height: `${stampH}px`, zIndex: Math.floor(rng(i * 5 + 2) * 20) + 1 }}
                  >
                    <StampSvg stamp={stamp} idKey={String(i)} config={config} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stamp detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-[460px] bg-obsidian border border-bone/15 rounded-2xl overflow-hidden flex"
            style={{ boxShadow: `0 0 0 1px ${selColor}22, 0 24px 60px rgba(0,0,0,0.6)` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left — details */}
            <div className="flex-1 p-6 flex flex-col justify-center gap-3 min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm self-start border" style={{ color: selColor, borderColor: `${selColor}55` }}>
                {selected.rarity}
              </span>
              <h3 className="font-basement font-black text-[24px] uppercase leading-[0.95] text-bone">{selected.title}</h3>
              <p className="font-mono text-[11px] leading-[1.7] text-bone/55">{selected.description}</p>
              <div className="mt-1 pt-3 border-t border-bone/10">
                <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/30 block">Issued</span>
                <span className="font-mono text-[13px] uppercase tracking-wider text-bone">{selected.date}</span>
              </div>
            </div>
            {/* Right — the stamp */}
            <div className="w-[176px] shrink-0 flex items-center justify-center border-l border-bone/10 bg-bone/[0.02] p-5">
              <div style={{ width: 150, height: selRectShape ? 84 : 150 }}>
                <StampSvg stamp={selected} idKey="modal" config={config} />
              </div>
            </div>
            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-bone/50 hover:text-bone hover:bg-bone/10 transition cursor-pointer bg-transparent border-none"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
