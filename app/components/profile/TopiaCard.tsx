'use client';

import { useEffect, useRef, useState } from 'react';
import { PATH_CONFIG, resolvePath, type UserPath } from './pathConfig';

export interface TopiaCardProps {
  name: string;
  username: string;
  avatarUrl?: string | null;
  roleTags?: string[];
  path?: UserPath | string | null;
  issued?: number;
}

const MAX_TILT = 16; // degrees

// A holographic, motion-reactive "Topia card". Tilts toward the cursor on
// desktop and toward device orientation on mobile (hand movement). Mirrors the
// shareable card image at /api/profile/<username>/card.
export default function TopiaCard({ name, username, avatarUrl, roleTags = [], path, issued }: TopiaCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [motionOn, setMotionOn] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const resolved = resolvePath(typeof path === 'string' ? path : null, roleTags, false);
  const cfg = PATH_CONFIG[resolved];
  const accent = cfg.hex;
  const onAccent = resolved === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const initial = (name || username || '?')[0]?.toUpperCase() ?? '?';
  const year = issued ?? new Date().getFullYear();

  // iOS 13+ gates DeviceOrientation behind a permission prompt.
  useEffect(() => {
    const DOE = typeof window !== 'undefined' ? (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }) : undefined;
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsMotionPermission(true);
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      enableMotion();
    }
    return () => window.removeEventListener('deviceorientation', onOrient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onOrient(e: DeviceOrientationEvent) {
    const gamma = e.gamma ?? 0; // left/right [-90,90]
    const beta = e.beta ?? 0;   // front/back [-180,180]
    const clamp = (v: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
    setTilt({ y: clamp(gamma * 0.5), x: clamp((45 - beta) * 0.4) });
  }

  function enableMotion() {
    window.addEventListener('deviceorientation', onOrient, true);
    setMotionOn(true);
    setNeedsMotionPermission(false);
  }

  async function requestMotion() {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const res = await DOE.requestPermission?.();
      if (res === 'granted') enableMotion();
    } catch { /* denied */ }
  }

  function onMove(clientX: number, clientY: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (clientX - r.left) / r.width - 0.5;
    const py = (clientY - r.top) / r.height - 0.5;
    setTilt({ y: px * MAX_TILT * 2, x: -py * MAX_TILT * 2 });
    setActive(true);
  }

  const sheenX = 50 + (tilt.y / MAX_TILT) * 40;
  const sheenY = 50 - (tilt.x / MAX_TILT) * 40;
  const intensity = Math.min(1, (Math.abs(tilt.x) + Math.abs(tilt.y)) / (MAX_TILT * 1.4));

  return (
    <div style={{ perspective: '1100px' }} className="select-none">
      <div
        ref={ref}
        onMouseMove={(e) => onMove(e.clientX, e.clientY)}
        onMouseLeave={() => { if (!motionOn) { setTilt({ x: 0, y: 0 }); setActive(false); } }}
        onTouchMove={(e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }}
        onTouchEnd={() => { if (!motionOn) { setTilt({ x: 0, y: 0 }); setActive(false); } }}
        className="relative w-[300px] max-w-full aspect-[4/5] rounded-2xl overflow-hidden"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: active || motionOn ? 'transform 80ms ease-out' : 'transform 500ms ease-out',
          background: '#0f0f0f',
          border: `1px solid ${accent}55`,
          boxShadow: `0 30px 60px -20px rgba(0,0,0,0.7), 0 0 40px -12px ${accent}66`,
        }}
      >
        {/* path glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 30%, ${accent}33 0%, transparent 60%)` }} />

        {/* content */}
        <div className="relative h-full flex flex-col p-5" style={{ transform: 'translateZ(40px)' }}>
          <div className="flex items-center justify-between">
            <span className="font-basement font-black text-[14px] tracking-[3px] uppercase text-bone">TOPIA<span style={{ color: accent }}>.</span></span>
            <span className="font-mono text-[8px] tracking-[2px] uppercase text-bone/40">identity</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center" style={{ border: `3px solid ${accent}`, background: '#161616' }}>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-basement font-black text-[40px] text-bone/50">{initial}</span>
              )}
            </div>
            <div className="font-basement font-black text-[26px] uppercase text-bone leading-none mt-4 text-center px-2 truncate max-w-full">{name || username || 'Unnamed'}</div>
            <div className="font-mono text-[11px] text-bone/55 mt-1">@{username}</div>
            <div className="mt-3 font-mono text-[9px] font-bold tracking-[3px] uppercase px-3 py-1 rounded" style={{ background: accent, color: onAccent }}>{cfg.label}</div>
            {roleTags.length > 0 && (
              <div className="font-mono text-[8px] tracking-[2px] uppercase text-bone/40 mt-3 text-center px-2 truncate max-w-full">
                {roleTags.slice(0, 3).map((r) => r.replace(/-/g, ' ')).join('  ·  ')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between font-mono text-[8px] tracking-[2px] uppercase text-bone/35">
            <span>issued {year}</span>
            <span>topia.vision</span>
          </div>
        </div>

        {/* holographic sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%)`,
            mixBlendMode: 'soft-light',
            opacity: 0.3 + intensity * 0.5,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${105 + tilt.y * 2}deg, transparent 30%, ${accent}22 50%, transparent 70%)`,
            opacity: intensity,
          }}
        />
      </div>

      {needsMotionPermission && (
        <button onClick={requestMotion} className="mt-3 mx-auto block font-mono text-[10px] uppercase tracking-[2px] text-bone/50 hover:text-bone underline bg-transparent border-none cursor-pointer">
          tilt with motion →
        </button>
      )}
    </div>
  );
}
