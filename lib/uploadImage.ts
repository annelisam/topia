/**
 * Shared image-upload helpers.
 *
 * Most images on TOPIA are canvas-compressed to inline JPEG data URLs (cheap,
 * no network round-trip). That path FLATTENS animated GIFs to a single frame
 * and would also balloon a multi-MB GIF into an even larger base64 string.
 *
 * So GIFs take a different route: upload the raw file to Vercel Blob (via the
 * existing cover-upload endpoint) and store the returned public URL. Animation
 * survives, and the DB stores a short URL instead of a giant data URL. The
 * display side needs no changes — an `<img>` plays a GIF URL automatically.
 */

const UPLOAD_ENDPOINT = '/api/events/cover-upload';

export function isGif(file: File): boolean {
  return file.type === 'image/gif';
}

/** Upload a raw file to Vercel Blob; resolves to the public URL. */
export async function uploadToBlob(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  if (!data?.url) throw new Error('Upload succeeded but no URL was returned');
  return data.url as string;
}
