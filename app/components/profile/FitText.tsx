'use client';

import { useLayoutEffect, useRef } from 'react';

interface Props {
  text: string;
  /** Font size to start from (px) — the size short text renders at. */
  maxSize: number;
  /** Hard floor (px) — text never shrinks below this. */
  minSize: number;
  /** Line count the text must fit within. */
  maxLines?: number;
  /** Unitless line-height used both for rendering and the fit check. */
  lineHeight?: number;
  className?: string;
}

// Fit-to-box text, the way physical ID cards handle long names: the full
// text always shows, shrinking (never ellipsizing) until it fits the
// allowed lines. Lines are balanced so a two-line name reads as a designed
// lockup instead of a ragged break.
export default function FitText({ text, maxSize, minSize, maxLines = 2, lineHeight = 0.95, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Rough pre-guess from length so SSR/first paint is close and the
  // measured correction (below) barely moves.
  const guess = text.length > 26 ? minSize : text.length > 14 ? Math.max(minSize, Math.round(maxSize * 0.7)) : maxSize;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = maxSize;
      el.style.fontSize = `${size}px`;
      // scroll metrics ignore ancestor transforms (the card deck scales
      // cards via GSAP), so they're safe to measure against.
      const fits = () => el.scrollHeight <= size * lineHeight * maxLines + 2 && el.scrollWidth <= el.clientWidth + 1;
      while (!fits() && size > minSize) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    // Webfont metrics differ from the fallback's — re-fit once they're in.
    document.fonts?.ready.then(() => { if (ref.current) fit(); });
  }, [text, maxSize, minSize, maxLines, lineHeight]);

  return (
    <div ref={ref} className={className} style={{ fontSize: guess, lineHeight, textWrap: 'balance' }}>
      {text}
    </div>
  );
}
