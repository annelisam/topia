// Client-side access to the viewer's permanent Topia connect path
// (/connect/<code>). The code never changes for a user, so it's safe to
// cache in localStorage forever — that's what makes the card's QR back
// face and Event Mode's pass render instantly instead of waiting on a
// round-trip every open.

const key = (privyId: string) => `topia:connect-path:${privyId}`;

export function cachedConnectPath(privyId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(key(privyId));
    return v && v.startsWith('/connect/') ? v : null;
  } catch {
    return null;
  }
}

/** Cached-first fetch of the viewer's connect path. */
export async function getConnectPath(privyId: string): Promise<string | null> {
  const cached = cachedConnectPath(privyId);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/connect/code?privyId=${encodeURIComponent(privyId)}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (typeof d?.path !== 'string' || !d.path.startsWith('/connect/')) return null;
    try { localStorage.setItem(key(privyId), d.path); } catch { /* private mode */ }
    return d.path;
  } catch {
    return null;
  }
}
