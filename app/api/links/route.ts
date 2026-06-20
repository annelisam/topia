import { NextRequest, NextResponse } from 'next/server';
import { ensureShortLink } from '@/lib/shortlinkStore';

// POST /api/links — turn an internal path into a short code.
//   body: { path: "/events/foo", kind?: "event" | "profile" | "world" }
//   → { code, url }   where url = <origin>/s/<code>
//
// Deduped by target_path (see ensureShortLink). Only same-origin relative
// paths are accepted (open-redirect guard lives in normalizePath).
export async function POST(request: NextRequest) {
  let body: { path?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const code = await ensureShortLink({ path: body.path ?? '', kind: body.kind });
    if (!code) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    return NextResponse.json({ code, url: `${request.nextUrl.origin}/s/${code}` });
  } catch (error) {
    console.error('POST /api/links error:', error);
    return NextResponse.json({ error: 'Failed to create short link' }, { status: 500 });
  }
}
