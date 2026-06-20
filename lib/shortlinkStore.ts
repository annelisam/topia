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

const PREFERRED_CODE = /^[A-Za-z0-9._~-]{1,80}$/;

// Returns the code for `path`, creating it if needed. Idempotent: a page that
// already has a code returns it unchanged. `preferredCode` (e.g. a world slug)
// is used as the code when it's free; otherwise a random code is allocated. An
// existing row is "promoted" to the preferred code when it becomes available
// (so worlds reliably read /s/<slug>). Returns null on invalid path or if a
// code couldn't be allocated. Best-effort — callers should not let it throw.
export async function ensureShortLink(opts: {
  path: string;
  kind?: string | null;
  createdBy?: string | null;
  preferredCode?: string | null;
}): Promise<string | null> {
  const path = normalizePath(opts.path);
  if (!path) return null;
  const kind = opts.kind && opts.kind.length <= 32 ? opts.kind : null;
  const pref = opts.preferredCode && PREFERRED_CODE.test(opts.preferredCode) ? opts.preferredCode : null;

  const existing = await db
    .select({ code: shortLinks.code })
    .from(shortLinks)
    .where(eq(shortLinks.targetPath, path))
    .limit(1);
  if (existing[0]) {
    if (pref && existing[0].code !== pref) {
      // Promote to the preferred (pretty) code if it's not already taken.
      try {
        await db.update(shortLinks).set({ code: pref }).where(eq(shortLinks.targetPath, path));
        return pref;
      } catch {
        return existing[0].code; // preferred code in use elsewhere — keep current
      }
    }
    return existing[0].code;
  }

  const tries: string[] = pref ? [pref] : [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = tries.shift() ?? genCode(6);
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
      if (attempt === 4) return null; // preferred + retries all clashed
    }
  }
  return null;
}

// Builds the public share URL for a link. Profiles get a vanity /@username;
// everything else uses /s/<code> (world slug or random event code).
export function buildShortUrl(origin: string, opts: { kind?: string | null; code: string; path: string }): string {
  if (opts.kind === 'profile') {
    const username = opts.path.replace(/^\/profile\//, '');
    if (username && !username.includes('/')) return `${origin}/@${username}`;
  }
  return `${origin}/s/${opts.code}`;
}
