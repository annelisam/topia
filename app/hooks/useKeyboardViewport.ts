import { useEffect, type RefObject } from 'react';

// Clamp a fixed, full-screen layer to the *visible* viewport — the area above
// the iOS software keyboard — using window.visualViewport. Point this at a flex
// `items-end` positioning layer that holds a bottom sheet; clamping its height
// to the visible area makes the sheet's bottom edge (a pinned composer) sit
// flush on top of the keyboard instead of floating with a gap.
//
// Requires the page to use the default `interactive-widget=overlays-content`
// (NOT resizes-content): the keyboard must overlay the page so the layout
// viewport stays full-height and visualViewport reveals the true keyboard edge.
//
// First-open robustness: on iOS Safari the very first keyboard open reports its
// final geometry a beat late, so we re-apply on focusin and again across the
// keyboard's open animation (rAF + 100ms + 300ms). A separate full-screen
// backdrop (not clamped) should sit behind this layer so a late frame never
// shows the page.
//
// No-op at ≥640px: desktop has no software keyboard and the modal is centered,
// so inline styles are cleared and CSS takes over.
export function useKeyboardViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const el = ref.current;
    if (!vv || !el) return;

    const apply = () => {
      if (window.innerWidth >= 640) {
        el.style.top = '';
        el.style.bottom = '';
        el.style.height = '';
        return;
      }
      // Pin the layer to the visible rectangle above the keyboard.
      el.style.top = `${vv.offsetTop}px`;
      el.style.bottom = 'auto';
      el.style.height = `${vv.height}px`;
    };
    // Re-apply across the keyboard's open animation to defeat the first-open lag.
    const applySoon = () => {
      apply();
      requestAnimationFrame(apply);
      setTimeout(apply, 100);
      setTimeout(apply, 300);
    };

    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    window.addEventListener('focusin', applySoon);
    window.addEventListener('orientationchange', applySoon);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      window.removeEventListener('focusin', applySoon);
      window.removeEventListener('orientationchange', applySoon);
      el.style.top = '';
      el.style.bottom = '';
      el.style.height = '';
    };
  }, [ref]);
}
