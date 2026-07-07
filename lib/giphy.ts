// Stored imageUrl for GIF posts can point at heavy renditions (older rows
// persisted downsized_medium, up to ~5MB). Every surface that shows GIFs
// renders them at 200-310px wide, so when the Giphy id is known we display
// the 200px fixed-width animated-WebP rendition (3-5x smaller than the GIF
// equivalent) instead of whatever URL was stored.
export function giphyRenditionUrl(giphyId: string): string {
  return `https://media.giphy.com/media/${encodeURIComponent(giphyId)}/200w.webp`;
}

export function gifDisplayUrl(
  giphyId: string | null | undefined,
  imageUrl: string | null | undefined,
): string | null {
  if (giphyId) return giphyRenditionUrl(giphyId);
  return imageUrl ?? null;
}
