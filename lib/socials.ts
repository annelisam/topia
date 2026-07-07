/**
 * Extract a display handle from a stored social value.
 *
 * Social fields hold mixed shapes: the RSVP sync writes full URLs
 * (`https://instagram.com/handle`), OAuth linking and older rows may hold
 * bare handles or protocol-less URLs. Displays that render "@<handle>" must
 * go through this instead of using the raw value.
 */
export function socialHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  // Bare handle (possibly "@handle") — nothing URL-ish in it.
  if (!v.includes('/') && !v.includes('.')) return v.replace(/^@/, '') || null;
  try {
    const u = new URL(v.includes('://') ? v : `https://${v}`);
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first ? first.replace(/^@/, '') : null;
  } catch {
    return v.replace(/^@/, '') || null;
  }
}
