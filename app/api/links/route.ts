import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureShortLink, normalizePath, buildShortUrl } from '@/lib/shortlinkStore';

// POST /api/links — turn an internal path into a share URL.
//   body: { path, kind?: 'event'|'profile'|'world', privyId? }
//   → { code, url }
//     · profile → <origin>/@<username>
//     · world   → <origin>/s/<slug>
//     · event   → <origin>/s/<random>
// privyId (optional) attributes the link to the logged-in creator.
export async function POST(request: NextRequest) {
  let body: { path?: string; kind?: string; privyId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const path = normalizePath(body.path);
  if (!path) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  const kind = typeof body.kind === 'string' ? body.kind : null;

  try {
    // Attribute to the logged-in user when we can resolve them.
    let createdBy: string | null = null;
    if (body.privyId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, body.privyId)).limit(1);
      createdBy = u?.id ?? null;
    }

    // Worlds read /s/<slug>; events/profiles get random codes.
    const preferredCode = kind === 'world' ? path.replace(/^\/worlds\//, '') : undefined;

    const code = await ensureShortLink({ path, kind, createdBy, preferredCode });
    if (!code) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

    return NextResponse.json({ code, url: buildShortUrl(request.nextUrl.origin, { kind, code, path }) });
  } catch (error) {
    console.error('POST /api/links error:', error);
    return NextResponse.json({ error: 'Failed to create short link' }, { status: 500 });
  }
}
