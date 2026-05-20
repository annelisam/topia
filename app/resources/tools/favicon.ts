/**
 * Return a square favicon URL for a tool's website using Google's free
 * favicon service. Works for almost every public domain, no API key.
 *
 * https://www.google.com/s2/favicons?domain=DOMAIN&sz=N
 */
export function faviconUrl(toolUrl: string | null | undefined, size: number = 64): string | null {
  if (!toolUrl) return null;
  try {
    const u = new URL(toolUrl.includes('://') ? toolUrl : `https://${toolUrl}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${size}`;
  } catch {
    return null;
  }
}
