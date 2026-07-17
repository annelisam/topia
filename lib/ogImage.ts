// Best-effort OG/Twitter image fetch for a user-supplied site URL — used to
// derive a project preview when the builder hasn't uploaded a cover. Never
// throws; returns null on any failure. Server-side only.

const FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 300_000; // og tags live in <head>; don't stream whole sites

export async function fetchOgImage(siteUrl: string): Promise<string | null> {
  try {
    const target = new URL(/^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`);
    if (!/^https?:$/.test(target.protocol)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let html = '';
    try {
      const res = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'TopiaBot/1.0 (+https://topia.vision)', Accept: 'text/html' },
      });
      if (!res.ok || !res.body) return null;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      while (bytes < MAX_HTML_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break; // got what we came for
      }
      reader.cancel().catch(() => {});
    } finally {
      clearTimeout(timer);
    }

    const meta =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (!meta) return null;

    // Resolve relative og:image paths against the page; only keep http(s).
    const resolved = new URL(meta[1].replace(/&amp;/g, '&'), target).toString();
    if (!/^https?:\/\//.test(resolved)) return null;
    const url = resolved.slice(0, 2000);
    return (await looksLikeImage(url)) ? url : null;
  } catch {
    return null;
  }
}

// Sites ship stale og:image tags pointing at 404s; storing one gives every
// card a broken thumbnail. Reject only on a definitive bad answer (error
// status or non-image content-type) — a host that blocks HEAD or times out
// gets the benefit of the doubt, since the client falls back gracefully.
async function looksLikeImage(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'TopiaBot/1.0 (+https://topia.vision)' },
    });
    if (res.status === 405 || res.status === 501) return true; // HEAD unsupported
    if (!res.ok) return false;
    const type = res.headers.get('content-type');
    return !type || type.startsWith('image/');
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}
