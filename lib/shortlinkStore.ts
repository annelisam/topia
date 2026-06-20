// Server-side short-link store. Shared by /api/links (on-demand) and the
// creation endpoints (auto-generate on create). Deduped by target_path so a
// given page always maps to one stable code.

import { randomBytes } from 'crypto';
import { db } from './db';
import { shortLinks } from './db/schema';
import { eq } from 'drizzle-orm';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function genCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Accept only internal, same-origin paths: a single leading slash + safe chars.
// Rejects protocol-relative (`//host`), schemes, backslashes, our own routes.
const SAFE_PATH = /^\/[A-Za-z0-9\-._~/]+$/;

export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let p = raw.split('?')[0].split('#')[0].trim();
  if (!p || p.length > 512) return null;
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
  if (p.startsWith('//')) return null;
  if (!SAFE_PATH.test(p)) return null;
  if (p.startsWith('/s/') || p.startsWith('/api/')) return null;
  return p;
}

// Returns the code for `path`, creating it if needed. Idempotent: a page that
// already has a code returns it unchanged. Returns null on invalid path or if a
// code couldn't be allocated. Best-effort — callers should not let it throw.
export async function ensureShortLink(opts: {
  path: string;
  kind?: string | null;
  createdBy?: string | null;
}): Promise<string | null> {
  const path = normalizePath(opts.path);
  if (!path) return null;
  const kind = opts.kind && opts.kind.length <= 32 ? opts.kind : null;

  const existing = await db
    .select({ code: shortLinks.code })
    .from(shortLinks)
    .where(eq(shortLinks.targetPath, path))
    .limit(1);
  if (existing[0]) return existing[0].code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode(6);
    try {
      const inserted = await db
        .insert(shortLinks)
        .values({ code, targetPath: path, kind, createdBy: opts.createdBy ?? null })
        .returning({ code: shortLinks.code });
      return inserted[0].code;
    } catch {
      // Unique violation — concurrent create on the same path, or a code clash.
      const raced = await db
        .select({ code: shortLinks.code })
        .from(shortLinks)
        .where(eq(shortLinks.targetPath, path))
        .limit(1);
      if (raced[0]) return raced[0].code;
      if (attempt === 4) return null;
    }
  }
  return null;
}
