'use client';

/**
 * Renders an event cover. If the stored URL is a video (data URL starting
 * with `data:video/` or a remote URL ending in .mp4/.mov/.webm), renders a
 * silent autoplay loop. Otherwise renders an <img>. GIFs (`data:image/gif`
 * or `.gif` URLs) animate on their own via <img>.
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
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className={className} />;
}
