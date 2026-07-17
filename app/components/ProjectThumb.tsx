'use client';

import { useState } from 'react';

// Project cover art that can never render as a broken-image glyph. If the
// project has no cover, or its stored URL fails to load (dead og:image,
// hotlink-blocked host), it falls back to a deterministic brand gradient
// with the project's initial — same project, same gradient, everywhere.
const GRADIENTS: { background: string; color: string }[] = [
  { background: 'linear-gradient(135deg, var(--lime), var(--green))', color: 'var(--obsidian)' },
  { background: 'linear-gradient(135deg, var(--orange), var(--pink))', color: 'var(--obsidian)' },
  { background: 'linear-gradient(135deg, var(--blue), var(--pink))', color: 'var(--bone)' },
  { background: 'linear-gradient(135deg, var(--pink), var(--orange))', color: 'var(--obsidian)' },
  { background: 'linear-gradient(135deg, var(--green), var(--blue))', color: 'var(--bone)' },
  { background: 'linear-gradient(135deg, var(--lime), var(--orange))', color: 'var(--obsidian)' },
];

export function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function ProjectThumb({
  imageUrl,
  name,
  alt = '',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = '',
  initialClassName = 'text-[11px]',
}: {
  imageUrl?: string | null;
  name: string;
  alt?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  initialClassName?: string;
}) {
  // Track the URL that failed (not a boolean) so an edit that swaps in a new
  // cover retries instead of staying stuck on the gradient.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = imageUrl || null;

  if (src && src !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={imgClassName} onError={() => setFailedUrl(src)} />
    );
  }

  const g = gradientFor(name);
  return (
    <span
      className={`w-full h-full flex items-center justify-center ${fallbackClassName}`}
      style={{ background: g.background }}
      aria-hidden="true"
    >
      <span className={`font-basement font-black uppercase opacity-55 ${initialClassName}`} style={{ color: g.color }}>
        {name.trim()[0] || '?'}
      </span>
    </span>
  );
}
