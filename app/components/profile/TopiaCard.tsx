'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PATH_CONFIG, resolvePath, type UserPath } from './pathConfig';
import FitText from './FitText';

export interface TopiaCardProps {
  name: string;
  username: string;
  avatarUrl?: string | null;
  roleTags?: string[];
  path?: UserPath | string | null;
  issued?: number;
  // Hide the "tilt with motion →" permission prompt (e.g. inside a modal where
  // it crowds the layout).
  showMotionPrompt?: boolean;
}

const MAX_TILT = 16; // degrees

// Brand star mark (public/brand/logo.svg).
const LOGO_PATH = 'M248.244 0L249.567 0.534218C253.772 5.33588 268.237 51.6617 271.697 60.619C284.721 62.5024 301.944 69.6949 312.074 78.5385C334.862 70.9857 439.759 43.3727 459.298 46.3637C461.484 46.6985 462.317 47.3396 463.571 49.0776C465.702 60.2407 418.051 96.8812 407.934 104.568C398.897 111.44 364.575 134.502 361.352 143.426C360.265 146.449 361.346 149.374 363.035 151.895C367.19 158.093 376.047 165.05 381.599 170.415C393.226 181.651 464.838 248.37 466.894 253.53C467.503 255.059 467.372 255.385 466.745 256.79C464.751 257.837 462.31 257.453 460.273 256.646C447.845 251.725 434.926 245.672 422.753 240.223L344.023 204.894C333.831 200.33 316.223 191.852 306.099 189.27C293.771 205.447 277.044 216.059 259.418 225.553C262.722 206.006 266.939 198.44 280.616 183.724C253.176 201.589 251.517 218.376 246.822 248.511L240.052 290.743C239.381 294.816 238.307 307.771 233.965 308.234C229.102 305.491 216.287 266.833 213.231 258.28C211.027 251.366 208.603 244.524 205.962 237.765C190.337 237.905 177.772 234.302 163.662 228.192C150.793 231.326 138.046 235.939 125.301 239.61C107.921 244.617 22.5531 267.918 11.5262 261.181C10.399 260.492 9.91204 259.752 9.6754 258.429C7.76243 247.734 60.1691 206.796 70.5041 198.825C79.5652 191.839 97.6129 180.372 103.89 171.683C106.356 168.27 107.214 164.968 105.426 161.031C101.754 152.946 89.7704 143.608 83.1539 137.198L35.7116 91.749C29.2976 85.7031 1.00058 60.5289 0 54.5035C1.84713 51.5213 5.91839 52.8537 8.69903 54.0432C54.5271 73.6443 99.6694 95.0959 145.538 114.571C166.759 87.3145 183.573 75.3569 217.473 64.2429C220.258 63.3298 224.912 61.8744 227.492 63.2291C227.084 64.5845 226.105 66.0362 224.718 66.4996C205.103 73.0791 184.079 82.0028 170.459 98.2129C162.061 108.208 164.898 116.703 177.611 118.819C188.237 120.588 193.362 118.159 203.182 116.633L203.824 117.256L203.017 119.542L203.641 119.496L203.042 119.552L203.057 119.215L204.14 119.187C218.667 109.653 225.494 99.9361 231.642 83.452C237.108 68.8023 241.375 9.82322 247.915 0.464021L248.244 0ZM127.123 170.093C115.992 179.188 104.264 188.198 95.9739 199.982C93.7969 202.864 91.6573 205.924 92.3212 209.741C92.6628 211.705 93.7932 213.388 95.449 214.493C105.763 221.372 141.135 213.987 152.546 211.191C177.85 204.991 202.285 196.759 226.506 187.192C264.368 172.237 351.352 131.884 371.972 97.5477C373.482 95.0332 374.438 92.2019 375.419 89.4482C369.854 79.3243 362.37 81.1984 352.097 81.3823C343.178 81.6637 327.813 85.1615 318.664 87.0356C321.999 94.7953 331.85 115.583 328.968 124.298C327.819 127.766 315.478 134.659 311.602 136.988C269.119 162.33 223.691 182.369 176.333 196.657C164.044 200.304 149.084 203.651 136.324 203.945C129.054 187.856 129.113 187.892 127.123 170.093ZM135.125 166.47C140.35 159.41 159.48 132.169 152.141 124.272C150.467 123.501 150.138 123.303 148.314 123.174C138.823 130.001 128.168 155.269 132.383 166.421L133.306 167.331C134.698 167.072 134.124 167.376 135.125 166.47ZM295.857 79.5722C295.137 73.4058 279.032 67.3009 273.833 65.3511C278.374 76.6608 282.609 81.8463 295.857 79.5722Z';

// A holographic, motion-reactive "Topia card". Tilts toward the cursor on
// desktop and toward device orientation on mobile (hand movement). Mirrors the
// shareable card image at /api/profile/<username>/card.
export default function TopiaCard({ name, username, avatarUrl, roleTags = [], path, issued, showMotionPrompt = true }: TopiaCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 }); // latest tilt target (cursor / gyro)
  const cur = useRef({ x: 0, y: 0 });    // eased value, mirrored into `tilt`
  const motionOn = useRef(false);

  const resolved = resolvePath(typeof path === 'string' ? path : null, roleTags, false);
  const cfg = PATH_CONFIG[resolved];
  const accent = cfg.hex;
  const onAccent = resolved === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const initial = (name || username || '?')[0]?.toUpperCase() ?? '?';
  const year = issued ?? new Date().getFullYear();

  // Ease the rendered tilt toward the latest target every frame. Decouples the
  // noisy gyro / high-rate cursor input from rendering, so motion stays smooth
  // (no jitter) and only re-renders while actually moving.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = target.current, c = cur.current;
      const nx = c.x + (t.x - c.x) * 0.12;
      const ny = c.y + (t.y - c.y) * 0.12;
      if (Math.abs(nx - c.x) > 0.015 || Math.abs(ny - c.y) > 0.015) {
        cur.current = { x: nx, y: ny };
        setTilt({ x: nx, y: ny });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    const gamma = e.gamma ?? 0; // left/right [-90,90]
    const beta = e.beta ?? 0;   // front/back [-180,180]
    const clamp = (v: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
    target.current = { y: clamp(gamma * 0.5), x: clamp((45 - beta) * 0.45) };
  }, []);

  const enableMotion = useCallback(() => {
    window.addEventListener('deviceorientation', onOrient, true);
    motionOn.current = true;
    setNeedsMotionPermission(false);
  }, [onOrient]);

  // iOS 13+ gates DeviceOrientation behind a permission prompt.
  useEffect(() => {
    const DOE = typeof window !== 'undefined' ? (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }) : undefined;
    if (DOE && typeof DOE.requestPermission === 'function') {
      setNeedsMotionPermission(true);
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      enableMotion();
    }
    return () => window.removeEventListener('deviceorientation', onOrient, true);
  }, [enableMotion, onOrient]);

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
    target.current = { y: px * MAX_TILT * 2, x: -py * MAX_TILT * 2 };
  }

  // Ease back to flat when the pointer leaves (gyro mode keeps following).
  function recenter() {
    if (!motionOn.current) target.current = { x: 0, y: 0 };
  }

  const sheenX = 50 + (tilt.y / MAX_TILT) * 40;
  const sheenY = 50 - (tilt.x / MAX_TILT) * 40;
  const intensity = Math.min(1, (Math.abs(tilt.x) + Math.abs(tilt.y)) / (MAX_TILT * 1.4));

  return (
    <div style={{ perspective: '1100px' }} className="select-none">
      <div
        ref={ref}
        onMouseMove={(e) => onMove(e.clientX, e.clientY)}
        onMouseLeave={recenter}
        onTouchMove={(e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }}
        onTouchEnd={recenter}
        className="relative w-[300px] max-w-full aspect-[4/5] rounded-2xl overflow-hidden"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          // Stops the page/background from scrolling while dragging on the card.
          touchAction: 'none',
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
            <svg width="34" height="22" viewBox="0 0 468 309" fill="none" aria-label="Topia">
              <path d={LOGO_PATH} fill={accent} />
            </svg>
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
            <FitText
              text={name || username || 'Unnamed'}
              maxSize={26}
              minSize={14}
              className="font-basement font-black uppercase text-bone mt-4 text-center px-2 break-words w-full"
            />
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

      {showMotionPrompt && needsMotionPermission && (
        <button onClick={requestMotion} className="mt-3 mx-auto block font-mono text-[10px] uppercase tracking-[2px] text-bone/50 hover:text-bone underline bg-transparent border-none cursor-pointer">
          tilt with motion →
        </button>
      )}
    </div>
  );
}
