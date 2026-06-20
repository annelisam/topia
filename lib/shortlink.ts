// Client helper: turn an internal path into a short topia.vision/s/<code> URL
// via /api/links. Always resolves to a usable absolute URL — on any failure it
// falls back to the full long URL so sharing never breaks.

export async function shortenPath(path: string, kind?: string, privyId?: string): Promise<string> {
  const fallback =
    typeof window !== 'undefined' ? new URL(path, window.location.origin).toString() : path;
  try {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, kind, privyId }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return typeof data.url === 'string' ? data.url : fallback;
  } catch {
    return fallback;
  }
}
