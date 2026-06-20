import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { shortLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/links — turn an internal path into a short code.
//   body: { path: "/events/foo", kind?: "event" | "profile" | "world" }
//   → { code, url }   where url = <origin>/s/<code>
//
// Deduped by target_path (unique), so the same page always yields the same
// code. Only same-origin relative paths are accepted (open-redirect guard).

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Accept only internal, same-origin paths: a single leading slash, then a safe
// charset. Rejects protocol-relative (`//host`), schemes, backslashes, etc.
const SAFE_PATH = /^\/[A-Za-z0-9\-._~/]+$/;

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Drop any query/hash — short links point at a clean page.
  let p = raw.split('?')[0].split('#')[0].trim();
  if (!p || p.length > 512) return null;
  if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1); // strip trailing slash
  if (p.startsWith('//')) return null;
  if (!SAFE_PATH.test(p)) return null;
  // Don't shorten our own short links or API routes.
  if (p.startsWith('/s/') || p.startsWith('/api/')) return null;
  return p;
}

export async function POST(request: NextRequest) {
  let body: { path?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const path = normalizePath(body.path);
  if (!path) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

  const kind = typeof body.kind === 'string' && body.kind.length <= 32 ? body.kind : null;
  const origin = request.nextUrl.origin;

  try {
    // Already shortened? Reuse the existing code.
    const existing = await db
      .select({ code: shortLinks.code })
      .from(shortLinks)
      .where(eq(shortLinks.targetPath, path))
      .limit(1);
    if (existing[0]) {
      return NextResponse.json({ code: existing[0].code, url: `${origin}/s/${existing[0].code}` });
    }

    // Create a fresh code, retrying on the (rare) code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode(6);
      try {
        const inserted = await db
          .insert(shortLinks)
          .values({ code, targetPath: path, kind })
          .returning({ code: shortLinks.code });
        return NextResponse.json({ code: inserted[0].code, url: `${origin}/s/${inserted[0].code}` });
      } catch (e: unknown) {
        // Unique violation: another request created this path first, or the code
        // collided. Re-select by path (handles the concurrent-create race).
        const raced = await db
          .select({ code: shortLinks.code })
          .from(shortLinks)
          .where(eq(shortLinks.targetPath, path))
          .limit(1);
        if (raced[0]) {
          return NextResponse.json({ code: raced[0].code, url: `${origin}/s/${raced[0].code}` });
        }
        // Otherwise it was a code collision — loop and try a new code.
        if (attempt === 4) throw e;
      }
    }
    return NextResponse.json({ error: 'Could not allocate code' }, { status: 500 });
  } catch (error) {
    console.error('POST /api/links error:', error);
    return NextResponse.json({ error: 'Failed to create short link' }, { status: 500 });
  }
}
