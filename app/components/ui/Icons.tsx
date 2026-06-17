'use client';

/**
 * Sharp, straight-line check icon — two-stroke polyline with square caps
 * and mitered joins. No font dependency, scales cleanly at any size.
 * Color via currentColor.
 */
export function CheckIcon({ size = 10, strokeWidth = 1.8, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <polyline
        points="1.5,5.5 4,8 8.5,2.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}

/** Diamond/star "saved" mark. Filled. Straight edges. */
export function StarIcon({ size = 10, filled = true, className = '' }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className={className} style={{ flexShrink: 0 }}>
      <path
        d="M5 0.5 L6.5 3.5 L9.5 5 L6.5 6.5 L5 9.5 L3.5 6.5 L0.5 5 L3.5 3.5 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/** Share mark — three nodes joined by two lines (classic share glyph). */
export function ShareIcon({ size = 12, strokeWidth = 1.4, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" className={className} style={{ flexShrink: 0 }}>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9.5" cy="2.5" r="1.5" />
        <circle cx="2.5" cy="6" r="1.5" />
        <circle cx="9.5" cy="9.5" r="1.5" />
        <line x1="3.8" y1="5.3" x2="8.2" y2="3.2" />
        <line x1="3.8" y1="6.7" x2="8.2" y2="8.8" />
      </g>
    </svg>
  );
}
