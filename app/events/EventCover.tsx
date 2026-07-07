'use client';

import Image from 'next/image';

/**
 * Renders an event cover. If the stored URL is a video (data URL starting
 * with `data:video/` or a remote URL ending in .mp4/.mov/.webm), renders a
 * silent autoplay loop. Plain https images go through next/image (resized,
 * AVIF/WebP). GIFs and data: URLs stay on a raw <img> — next/image rejects
 * data URLs and shouldn't proxy animated GIFs.
 */
export default function EventCover({
  src,
  alt = '',
  className,
  lazy = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  // List/grid cards pass true; the browser still loads in-viewport lazy
  // images immediately, so above-fold cards are unaffected.
  lazy?: boolean;
}) {
  if (!src) return null;
  const lower = src.toLowerCase();
  const isVideo =
    lower.startsWith('data:video/') ||
    /\.(mp4|mov|webm)(\?|#|$)/.test(lower);

  if (isVideo) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        // poster prevents a flash of black before the first frame paints
        preload="metadata"
      />
    );
  }
  const optimizable = src.startsWith('https://') && !/\.gif(\?|#|$)/.test(lower);
  if (optimizable) {
    // Covers are predominantly 1200x1200 uploads; width/height set the
    // intrinsic ratio while the className (object-cover in a fixed box on
    // cards, w-full h-auto on detail) controls the rendered size.
    return (
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={1200}
        loading={lazy ? 'lazy' : undefined}
        sizes="(max-width: 768px) 100vw, 33vw"
        className={className}
      />
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className={className} />;
}
