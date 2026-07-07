'use client';

import Image from 'next/image';

/**
 * Renders a stored image URL (avatar, cover) through next/image when it's an
 * optimizable https source (resized, AVIF/WebP via the image optimizer).
 * data: URLs (generated SVG avatars), GIFs, and other legacy shapes fall back
 * to a raw <img> — next/image rejects data URLs and shouldn't proxy animated
 * GIFs. Mirrors the gating in app/events/EventCover.tsx.
 *
 * width/height set the requested (retina) resolution; the className controls
 * the rendered size, so pass ~2x the CSS pixel size.
 */
export default function BlobImage({
  src,
  alt = '',
  width,
  height,
  sizes,
  priority = false,
  draggable,
  className,
}: {
  src: string;
  alt?: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  draggable?: boolean;
  className?: string;
}) {
  if (!src) return null;
  const optimizable = src.startsWith('https://') && !/\.gif(\?|#|$)/.test(src.toLowerCase());
  if (!optimizable) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={src} alt={alt} loading={priority ? undefined : 'lazy'} draggable={draggable} className={className} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      draggable={draggable}
      className={className}
    />
  );
}
