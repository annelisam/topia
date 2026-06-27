'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Clamps a `fixed` element to the **visual** viewport so a bottom-anchored input
 * (a chat composer) rides exactly on top of the on-screen keyboard — no gap —
 * the way native apps do. When the iOS keyboard opens, `window.visualViewport`
 * shrinks and may offset; we mirror its height/top onto the element so an
 * `items-end` sheet inside it parks flush above the keyboard.
 *
 * Works across iOS Safari versions (doesn't depend on `interactive-widget`
 * support). Mobile-only: a no-op at ≥640px and where the API is unavailable.
 * Pair with a separate full-screen backdrop so nothing peeks through.
 */
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        if (window.innerWidth >= 640) { el.style.height = ''; el.style.top = ''; return; }
        el.style.height = `${vv.height}px`;
        el.style.top = `${vv.offsetTop}px`;
      });
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      const el = ref.current;
      if (el) { el.style.height = ''; el.style.top = ''; }
    };
  }, [ref]);
}
