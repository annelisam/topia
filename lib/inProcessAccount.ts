// Server-only half of the In Process integration: the connect flow ("Sign in
// with In•Process" email OTP → 1h JWT → mint a long-lived artist API key)
// and authenticated writes (mint moments). The API key can post AS the
// artist, so it's treated like a payment credential: AES-256-GCM encrypted
// at rest with IN_PROCESS_KEY_SECRET, decrypted only inside a request, never
// logged, never returned to any client.
//
// Graceful degradation (house rule #6): with no IN_PROCESS_KEY_SECRET set,
// isInProcessWriteConfigured() is false and every connect/write route
// answers 503 with a clear reason — reads (lib/inProcess.ts) keep working.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const IN_PROCESS_API = 'https://api.inprocess.world/api';
const FETCH_TIMEOUT_MS = 15000; // writes mint onchain server-side — allow time
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SALE_END_2100 = '4102444800'; // free open edition, effectively no end

export function isInProcessWriteConfigured(): boolean {
  return !!process.env.IN_PROCESS_KEY_SECRET;
}

function cipherKey(): Buffer {
  // sha256 of the env secret → stable 32-byte AES key regardless of secret length.
  return createHash('sha256').update(process.env.IN_PROCESS_KEY_SECRET!).digest();
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cipherKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}

export function decryptApiKey(blob: string): string | null {
  try {
    const [iv, tag, data] = blob.split(':').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', cipherKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null; // wrong secret or corrupted blob — treat as disconnected
  }
}

async function apiFetch(path: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${IN_PROCESS_API}${path}`, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST' as const,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

/* ── Connect flow ──────────────────────────────────────────────────── */

export async function sendOtpCode(email: string): Promise<{ sent: boolean; reason?: string }> {
  const res = await apiFetch('/oauth/code', json({ email }));
  return res.ok ? { sent: true } : { sent: false, reason: `in_process_${res.status || 'unreachable'}` };
}

export async function loginWithOtp(email: string, code: string): Promise<{ token: string; artistAddress: string } | { error: string }> {
  const res = await apiFetch('/oauth/login', json({ email, code }));
  const token = res.data?.token as string | undefined;
  const wallet = res.data?.social_wallet as string | undefined;
  if (!res.ok || !token || !wallet) return { error: res.status === 0 ? 'In Process is unreachable' : 'That code didn’t verify — try again' };
  return { token, artistAddress: wallet.toLowerCase() };
}

export async function mintArtistApiKey(jwt: string, keyName: string): Promise<string | null> {
  const res = await apiFetch('/artists/api-keys', json({ key_name: keyName }, { Authorization: `Bearer ${jwt}` }));
  return (res.data?.key as string | undefined) ?? null;
}

/* ── Writes ────────────────────────────────────────────────────────── */

// Reuse the artist's newest collection so Topia mints land on their existing
// timeline; only their very first moment ever deploys a new collection.
async function findArtistCollection(artistAddress: string): Promise<string | null> {
  const res = await apiFetch(`/collections?artist=${encodeURIComponent(artistAddress)}&limit=8&page=1`, { method: 'GET' });
  const collections = res.data?.collections as { address?: string; contract?: string }[] | undefined;
  const first = collections?.find((c) => c.address || c.contract);
  return (first?.address || first?.contract || null) as string | null;
}

function freeOpenEdition() {
  return {
    type: 'fixedPrice',
    pricePerToken: '0',
    saleStart: String(Math.floor(Date.now() / 1000)),
    saleEnd: SALE_END_2100,
  };
}

function metadataDataUri(meta: Record<string, unknown>): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(meta), 'utf8').toString('base64')}`;
}

export interface MintResult { ok: true; collectUrl: string; hash: string }
export interface MintError { ok: false; reason: string }

/** Mint a moment on the artist's In Process timeline. Text-only moments use
 * their writing endpoint; with an image we mirror it to Arweave via their
 * /upload and mint standard metadata. */
export async function mintMoment(opts: {
  apiKey: string;
  artistAddress: string;
  title: string;
  text?: string | null;
  imageUrl?: string | null;
}): Promise<MintResult | MintError> {
  const auth = { 'x-api-key': opts.apiKey };
  const existing = await findArtistCollection(opts.artistAddress);
  const contract = existing
    ? { address: existing }
    : { name: 'In Process', uri: metadataDataUri({ name: 'In Process', description: 'A collective onchain timeline' }) };

  let path: string;
  let body: Record<string, unknown>;

  if (opts.imageUrl) {
    // Mirror the image to Arweave, then mint with inline metadata (their own
    // production moments use data:application/json;base64 URIs).
    const up = await apiFetch('/upload', json({ url: opts.imageUrl }, auth));
    const arUri = up.data?.uri as string | undefined;
    if (!arUri) return { ok: false, reason: 'Image upload to Arweave failed' };
    path = '/moment/create';
    body = {
      contract,
      token: {
        tokenMetadataURI: metadataDataUri({
          name: opts.title,
          description: opts.text || '',
          image: arUri,
          content: { mime: 'image/*', uri: arUri },
        }),
        createReferral: ZERO_ADDRESS,
        salesConfig: freeOpenEdition(),
        mintToCreatorCount: 1,
      },
      account: opts.artistAddress,
      chainId: 8453,
    };
  } else {
    path = '/moment/create/writing';
    body = {
      title: opts.title,
      contract,
      token: {
        tokenContent: opts.text || opts.title,
        createReferral: ZERO_ADDRESS,
        salesConfig: freeOpenEdition(),
        mintToCreatorCount: 1,
      },
      account: opts.artistAddress,
      chainId: 8453,
    };
  }

  const res = await apiFetch(path, json(body, auth));
  const contractAddress = res.data?.contractAddress as string | undefined;
  const tokenId = res.data?.tokenId as string | undefined;
  const hash = res.data?.hash as string | undefined;
  if (!res.ok || !contractAddress || tokenId == null) {
    console.error('[in-process] mint failed:', res.status, JSON.stringify(res.data)?.slice(0, 300));
    return { ok: false, reason: res.status === 0 ? 'In Process is unreachable' : `Mint failed (${res.status})` };
  }
  return { ok: true, hash: hash ?? '', collectUrl: `https://inprocess.world/collect/base:${contractAddress}/${tokenId}` };
}
