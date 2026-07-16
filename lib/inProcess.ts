// In Process (inprocess.world) — read-only integration with the onchain
// artist-timeline platform by LATASHÁ + sweetman.eth. Their REST API is
// public and unauthenticated for reads; artists are wallet addresses.
// House rule #6 applies throughout: every failure degrades to an empty
// timeline with a logged reason — never a thrown error in a request path.

const IN_PROCESS_API = 'https://api.inprocess.world/api';
const FETCH_TIMEOUT_MS = 5000;
const METADATA_TIMEOUT_MS = 4000;

export interface InProcessMoment {
  id: string;
  name: string | null;
  imageUrl: string | null;
  mime: string | null;
  createdAt: string | null;
  collectUrl: string | null;   // link out to inprocess.world to view/collect
  username: string | null;
}

/** Pull a 0x address out of whatever the builder pasted — a bare address or
 * an inprocess.world profile URL. */
export function extractArtistAddress(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0].toLowerCase() : null;
}

function resolveArweave(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('ar://')) return `https://arweave.net/${uri.slice(5)}`;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return /^https?:\/\//.test(uri) ? uri : null;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The artist's latest moments, with metadata (name/image) resolved from
 * Arweave best-effort. Empty array on any failure. */
export async function fetchArtistTimeline(artistAddress: string, limit = 8): Promise<InProcessMoment[]> {
  const data = await fetchJson(
    `${IN_PROCESS_API}/timeline?artist=${encodeURIComponent(artistAddress)}&limit=${Math.min(20, limit)}&page=1`,
    FETCH_TIMEOUT_MS,
  ) as { moments?: Record<string, unknown>[] } | null;
  if (!data?.moments?.length) {
    if (data === null) console.warn('[in-process] timeline fetch failed for', artistAddress);
    return [];
  }

  return Promise.all(data.moments.slice(0, limit).map(async (m) => {
    const creator = m.creator as { address?: string; username?: string } | undefined;
    const chainId = Number(m.chain_id ?? 8453);
    const chainSlug = chainId === 8453 ? 'base' : chainId === 84532 ? 'base-sepolia' : String(chainId);
    const collectUrl = m.address && m.token_id != null
      ? `https://inprocess.world/collect/${chainSlug}:${m.address}/${m.token_id}`
      : creator?.address ? `https://inprocess.world/${creator.address}` : null;

    // Moment metadata (standard NFT JSON: name/image). Three uri shapes in
    // the wild: inline `data:application/json;base64,…`, `ar://…`, plain
    // https. Resolve without ever letting one slow gateway sink the request.
    let name: string | null = null;
    let imageUrl: string | null = null;
    let mime: string | null = null;
    const rawUri = m.uri as string | undefined;
    let meta: Record<string, unknown> | null = null;
    if (rawUri?.startsWith('data:application/json;base64,')) {
      try { meta = JSON.parse(Buffer.from(rawUri.split(',')[1], 'base64').toString('utf8')); } catch { /* malformed inline metadata */ }
    } else {
      const metadataUrl = resolveArweave(rawUri);
      if (metadataUrl) meta = await fetchJson(metadataUrl, METADATA_TIMEOUT_MS) as Record<string, unknown> | null;
    }
    if (meta) {
      name = typeof meta.name === 'string' ? meta.name : null;
      imageUrl = resolveArweave(meta.image as string | undefined);
      const content = meta.content as { mime?: string } | undefined;
      mime = typeof content?.mime === 'string' ? content.mime : null;
    }

    return {
      id: String(m.id ?? `${m.address}-${m.token_id}`),
      name,
      imageUrl,
      mime,
      createdAt: typeof m.created_at === 'string' ? m.created_at : null,
      collectUrl,
      username: creator?.username ?? null,
    };
  }));
}
