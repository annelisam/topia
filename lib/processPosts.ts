// Client-safe helpers for process-log posts. Kinds mirror In Process's
// create flow — moment / thought / link / embed — with the era standing in
// for their "collection".

export type PostKind = 'moment' | 'thought' | 'link' | 'embed';

export const POST_KINDS: { id: PostKind; label: string; glyph: string; hint: string }[] = [
  { id: 'moment', label: 'Moment', glyph: '✦', hint: 'An image + a few words' },
  { id: 'thought', label: 'Thought', glyph: '✎', hint: 'Just words' },
  { id: 'link', label: 'Link', glyph: '🔗', hint: 'Paste any link from the internet' },
  { id: 'embed', label: 'Embed', glyph: '▶', hint: 'A YouTube / SoundCloud / Spotify link' },
];

export function postKindGlyph(kind: string | null | undefined): string {
  return POST_KINDS.find((k) => k.id === kind)?.glyph ?? '✦';
}

/** Derive a thumbnail for link/embed posts with no uploaded image —
 * currently YouTube video thumbs; everything else gets the glyph card. */
export function linkThumbnail(url: string | null | undefined): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}

/** Fallback title for link/embed posts: the host name. */
export function hostTitle(url: string): string {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}
