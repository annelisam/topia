'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { PATH_CONFIG, resolvePath, type UserPath } from '../profile/pathConfig';

export interface LoopProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  roleTags: string | null;
  path: string | null;
  isWorldBuilder?: boolean;
  createdAt?: string;
}

interface Props {
  profiles: LoopProfile[];
  /** Show the "complete your profile" nudge card in the lineup. */
  showCompleteCta?: boolean;
}

// Brand star mark (public/brand/logo.svg) — same path TopiaCard uses.
const LOGO_PATH = 'M248.244 0L249.567 0.534218C253.772 5.33588 268.237 51.6617 271.697 60.619C284.721 62.5024 301.944 69.6949 312.074 78.5385C334.862 70.9857 439.759 43.3727 459.298 46.3637C461.484 46.6985 462.317 47.3396 463.571 49.0776C465.702 60.2407 418.051 96.8812 407.934 104.568C398.897 111.44 364.575 134.502 361.352 143.426C360.265 146.449 361.346 149.374 363.035 151.895C367.19 158.093 376.047 165.05 381.599 170.415C393.226 181.651 464.838 248.37 466.894 253.53C467.503 255.059 467.372 255.385 466.745 256.79C464.751 257.837 462.31 257.453 460.273 256.646C447.845 251.725 434.926 245.672 422.753 240.223L344.023 204.894C333.831 200.33 316.223 191.852 306.099 189.27C293.771 205.447 277.044 216.059 259.418 225.553C262.722 206.006 266.939 198.44 280.616 183.724C253.176 201.589 251.517 218.376 246.822 248.511L240.052 290.743C239.381 294.816 238.307 307.771 233.965 308.234C229.102 305.491 216.287 266.833 213.231 258.28C211.027 251.366 208.603 244.524 205.962 237.765C190.337 237.905 177.772 234.302 163.662 228.192C150.793 231.326 138.046 235.939 125.301 239.61C107.921 244.617 22.5531 267.918 11.5262 261.181C10.399 260.492 9.91204 259.752 9.6754 258.429C7.76243 247.734 60.1691 206.796 70.5041 198.825C79.5652 191.839 97.6129 180.372 103.89 171.683C106.356 168.27 107.214 164.968 105.426 161.031C101.754 152.946 89.7704 143.608 83.1539 137.198L35.7116 91.749C29.2976 85.7031 1.00058 60.5289 0 54.5035C1.84713 51.5213 5.91839 52.8537 8.69903 54.0432C54.5271 73.6443 99.6694 95.0959 145.538 114.571C166.759 87.3145 183.573 75.3569 217.473 64.2429C220.258 63.3298 224.912 61.8744 227.492 63.2291C227.084 64.5845 226.105 66.0362 224.718 66.4996C205.103 73.0791 184.079 82.0028 170.459 98.2129C162.061 108.208 164.898 116.703 177.611 118.819C188.237 120.588 193.362 118.159 203.182 116.633L203.824 117.256L203.017 119.542L203.641 119.496L203.042 119.552L203.057 119.215L204.14 119.187C218.667 109.653 225.494 99.9361 231.642 83.452C237.108 68.8023 241.375 9.82322 247.915 0.464021L248.244 0ZM127.123 170.093C115.992 179.188 104.264 188.198 95.9739 199.982C93.7969 202.864 91.6573 205.924 92.3212 209.741C92.6628 211.705 93.7932 213.388 95.449 214.493C105.763 221.372 141.135 213.987 152.546 211.191C177.85 204.991 202.285 196.759 226.506 187.192C264.368 172.237 351.352 131.884 371.972 97.5477C373.482 95.0332 374.438 92.2019 375.419 89.4482C369.854 79.3243 362.37 81.1984 352.097 81.3823C343.178 81.6637 327.813 85.1615 318.664 87.0356C321.999 94.7953 331.85 115.583 328.968 124.298C327.819 127.766 315.478 134.659 311.602 136.988C269.119 162.33 223.691 182.369 176.333 196.657C164.044 200.304 149.084 203.651 136.324 203.945C129.054 187.856 129.113 187.892 127.123 170.093ZM135.125 166.47C140.35 159.41 159.48 132.169 152.141 124.272C150.467 123.501 150.138 123.303 148.314 123.174C138.823 130.001 128.168 155.269 132.383 166.421L133.306 167.331C134.698 167.072 134.124 167.376 135.125 166.47ZM295.857 79.5722C295.137 73.4058 279.032 67.3009 273.833 65.3511C278.374 76.6608 282.609 81.8463 295.857 79.5722Z';

const CARD_W = 236;
const CARD_H = 295;
// One card enters the stage roughly this often while drifting (seconds).
const DRIFT_SECONDS_PER_CARD = 1.6;

/* eslint-disable @typescript-eslint/no-explicit-any */
// GSAP's buildSeamlessLoop helper — the engine behind the GreenSock
// "seamless loop" cards CodePen this strip replicates. Every card runs the
// same animation (fly across the stage while scaling up to the center, back
// down toward the edge), staggered by `spacing`, and the sequence is tripled
// so the playhead can loop through the middle copy forever without a seam.
function buildSeamlessLoop(items: HTMLElement[], spacing: number, animateFunc: (el: HTMLElement) => gsap.core.Timeline) {
  const rawSequence = gsap.timeline({ paused: true });
  const seamlessLoop = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat(this: any) {
      if (this._time === this._dur) this._tTime += this._dur - 0.01;
    },
    onReverseComplete(this: any) {
      this.totalTime(this.rawTime() + this.duration() * 100);
    },
  });
  const cycleDuration = spacing * items.length;
  let dur = 0;

  items.concat(items).concat(items).forEach((_, i) => {
    const anim = animateFunc(items[i % items.length]);
    rawSequence.add(anim, i * spacing);
    if (!dur) dur = anim.duration();
  });

  seamlessLoop.fromTo(
    rawSequence,
    { time: cycleDuration + dur / 2 },
    { time: '+=' + cycleDuration, duration: cycleDuration, ease: 'none' }
  );
  return seamlessLoop;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// One passport card — the same design language as TopiaCard (the shareable
// identity card), lightweight for a deck of 20+: no per-card tilt loop.
function PassportCard({ p }: { p: LoopProfile }) {
  const roleTags = (p.roleTags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const resolved = resolvePath(p.path, roleTags, !!p.isWorldBuilder);
  const cfg = PATH_CONFIG[resolved as UserPath] ?? PATH_CONFIG.anchor;
  const accent = cfg.hex;
  const onAccent = resolved === 'worldbuilder' ? '#0a0a0a' : '#f5f0e8';
  const initial = (p.name || p.username || '?')[0]?.toUpperCase() ?? '?';
  const issued = p.createdAt ? new Date(p.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden"
      style={{
        background: '#0f0f0f',
        border: `1px solid ${accent}55`,
        boxShadow: `0 20px 44px -18px rgba(0,0,0,0.7), 0 0 32px -12px ${accent}66`,
      }}
    >
      {/* path glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 30%, ${accent}33 0%, transparent 60%)` }} />

      <div className="relative h-full flex flex-col p-4">
        <div className="flex items-center justify-between">
          <svg width="28" height="18" viewBox="0 0 468 309" fill="none" aria-hidden>
            <path d={LOGO_PATH} fill={accent} />
          </svg>
          <span className="font-mono text-[7px] tracking-[2px] uppercase text-bone/40">identity</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ border: `3px solid ${accent}`, background: '#161616' }}>
            {p.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={p.avatarUrl} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover" />
            ) : (
              <span className="font-basement font-black text-[32px] text-bone/50">{initial}</span>
            )}
          </div>
          <div className="font-basement font-black text-[20px] uppercase text-bone leading-none mt-3 text-center px-1 truncate max-w-full">{p.name || `@${p.username}`}</div>
          <div className="font-mono text-[10px] text-bone/55 mt-1 truncate max-w-full">@{p.username}</div>
          <div className="mt-2.5 font-mono text-[8px] font-bold tracking-[2.5px] uppercase px-2.5 py-1 rounded" style={{ background: accent, color: onAccent }}>{cfg.label}</div>
          {roleTags.length > 0 && (
            <div className="font-mono text-[7px] tracking-[1.5px] uppercase text-bone/40 mt-2.5 text-center px-1 truncate max-w-full">
              {roleTags.slice(0, 3).map((r) => r.replace(/-/g, ' ')).join('  ·  ')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between font-mono text-[7px] tracking-[1.5px] uppercase text-bone/35">
          <span>issued {issued}</span>
          <span>topia.vision</span>
        </div>
      </div>
    </div>
  );
}

// The DISCOVER deck: TOPIA passport cards streaming through a center stage —
// the GreenSock seamless-loop cards treatment (scale up into the middle,
// shrink and fade toward the edges), drifting continuously, draggable to
// scrub with a snap to the nearest card, no buttons.
export default function PassportLoop({ profiles, showCompleteCta = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  // Reduced-motion users get a plain scrollable strip instead of the deck.
  const [staticMode, setStaticMode] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setStaticMode(true);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || staticMode || profiles.length === 0) return;
    const items = gsap.utils.toArray<HTMLElement>('.passport-item', wrap);
    if (items.length < 3) return;

    gsap.registerPlugin(Draggable);

    // The CodePen's card animation: fly right→left across the stage while
    // scaling/fading up to full size at the center (zIndex on top), then back
    // down — yoyo'd so the exit mirrors the entrance.
    const spacing = 0.1;
    const snapTime = gsap.utils.snap(spacing);
    const animateFunc = (element: HTMLElement) => {
      const tl = gsap.timeline();
      tl.fromTo(
        element,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.in', immediateRender: false }
      ).fromTo(
        element,
        { xPercent: 400 },
        { xPercent: -400, duration: 1, ease: 'none', immediateRender: false },
        0
      );
      return tl;
    };

    const seamlessLoop = buildSeamlessLoop(items, spacing, animateFunc);
    const playhead = { offset: 0 };
    const wrapTime = gsap.utils.wrap(0, seamlessLoop.duration());
    const scrub = gsap.to(playhead, {
      offset: 0,
      onUpdate() { seamlessLoop.time(wrapTime(playhead.offset)); },
      duration: 0.5,
      ease: 'power3',
      paused: true,
    });
    const scrubTo = (offset: number) => {
      (scrub.vars as { offset: number }).offset = offset;
      scrub.invalidate().restart();
    };
    seamlessLoop.time(0); // render the initial card states

    // No buttons — instead the deck drifts forward on its own, pausing while
    // the pointer hovers or a drag is in flight.
    let hovered = false;
    let dragging = false;
    const drift = gsap.ticker.add((_t, deltaMs) => {
      if (hovered || dragging || scrub.isActive()) return;
      playhead.offset = wrapTime(playhead.offset + (deltaMs / 1000) * (spacing / DRIFT_SECONDS_PER_CARD));
      (scrub.vars as { offset: number }).offset = playhead.offset;
      seamlessLoop.time(playhead.offset);
    });

    // Drag to scrub, snap to the nearest card on release (the pen's proxy
    // pattern, sans InertiaPlugin).
    const proxy = document.createElement('div');
    let startOffset = 0;
    const draggable = Draggable.create(proxy, {
      type: 'x',
      trigger: wrap,
      onPress() {
        dragging = true;
        draggedRef.current = false;
        startOffset = (scrub.vars as { offset: number }).offset;
        gsap.set(proxy, { x: 0 });
      },
      onDrag() {
        draggedRef.current = true;
        scrubTo(startOffset + (this.startX - this.x) * 0.001);
      },
      onRelease() {
        dragging = false;
        if (draggedRef.current) {
          const settled = snapTime((scrub.vars as { offset: number }).offset);
          scrubTo(settled);
          playhead.offset = settled;
        }
        // Let the click event (if any) read draggedRef before clearing it.
        setTimeout(() => { draggedRef.current = false; }, 0);
      },
    })[0];

    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; };
    wrap.addEventListener('mouseenter', onEnter);
    wrap.addEventListener('mouseleave', onLeave);

    return () => {
      wrap.removeEventListener('mouseenter', onEnter);
      wrap.removeEventListener('mouseleave', onLeave);
      gsap.ticker.remove(drift);
      draggable.kill();
      scrub.kill();
      seamlessLoop.kill();
      gsap.set(items, { clearProps: 'all' });
    };
  }, [profiles, staticMode]);

  const suppressDragClick = (e: React.MouseEvent) => { if (draggedRef.current) e.preventDefault(); };

  const ctaCard = showCompleteCta && (
    <Link
      href="/onboarding"
      onClick={suppressDragClick}
      className="passport-item group flex flex-col items-center justify-center text-center gap-3 no-underline rounded-2xl border-2 border-dashed p-5 hover:border-lime transition-colors"
      style={{ width: CARD_W, height: CARD_H, borderColor: 'var(--border-color)', backgroundColor: 'var(--page-bg)' }}
      draggable={false}
    >
      <span className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center font-mono text-[22px] text-lime" style={{ borderColor: 'var(--border-color)' }}>+</span>
      <span className="font-basement font-black text-[16px] uppercase leading-tight" style={{ color: 'var(--foreground)' }}>Complete your passport</span>
      <span className="font-mono text-[10px] uppercase tracking-[2px] text-lime">Finish onboarding →</span>
    </Link>
  );

  if (staticMode) {
    return (
      <div className="flex gap-4 overflow-x-auto -mx-4 px-4 md:-mx-8 md:px-8 pb-2" style={{ scrollbarWidth: 'none' }}>
        {ctaCard}
        {profiles.map((p) => (
          <Link key={p.id} href={`/profile/${p.username}`} className="passport-item block shrink-0 no-underline" style={{ width: CARD_W, height: CARD_H }}>
            <PassportCard p={p} />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden -mx-4 md:-mx-8 select-none"
      style={{ height: CARD_H + 60, touchAction: 'pan-y', cursor: 'grab' }}
    >
      {/* Center stage — every card lives here; GSAP fans them across it */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: CARD_W, height: CARD_H }}>
        {ctaCard && <div className="absolute inset-0 passport-item opacity-0">{/* CTA joins the deck */}
          <Link
            href="/onboarding"
            onClick={suppressDragClick}
            className="group flex flex-col items-center justify-center text-center gap-3 no-underline rounded-2xl border-2 border-dashed p-5 hover:border-lime transition-colors w-full h-full"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--page-bg)' }}
            draggable={false}
          >
            <span className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center font-mono text-[22px] text-lime" style={{ borderColor: 'var(--border-color)' }}>+</span>
            <span className="font-basement font-black text-[16px] uppercase leading-tight" style={{ color: 'var(--foreground)' }}>Complete your passport</span>
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-lime">Finish onboarding →</span>
          </Link>
        </div>}
        {profiles.map((p) => (
          <Link
            key={p.id}
            href={`/profile/${p.username}`}
            onClick={suppressDragClick}
            className="passport-item absolute inset-0 block no-underline opacity-0"
            draggable={false}
          >
            <PassportCard p={p} />
          </Link>
        ))}
      </div>
    </div>
  );
}
