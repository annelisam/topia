'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Keeps a `fixed` overlay clamped to the **visual** viewport so an on-screen
 * keyboard never covers a bottom-anchored input (e.g. a chat composer). When the
 * iOS keyboard opens, `window.visualViewport` shrinks; we size the overlay to it
 * (and offset for any iOS scroll), so an `items-end` bottom sheet stays parked
 * directly above the keyboard instead of behind it.
 *
 * Mobile-only by design: a no-op at ≥640px (the centered-dialog layout) and
 * anywhere the API is unavailable. Reusable across our sheet modals so we stop
 * re-hitting the iOS keyboard problem — pair it with the global 16px input rule
 * in globals.css (which prevents focus-zoom).
 */
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    const apply = () => {
      const el = ref.current;
      if (!el) return;
      // Centered dialog on larger screens — leave layout to CSS.
      if (window.innerWidth >= 640) {
        el.style.height = '';
        el.style.top = '';
        return;
      }
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      const el = ref.current;
      if (el) { el.style.height = ''; el.style.top = ''; }
    };
  }, [ref]);
}
