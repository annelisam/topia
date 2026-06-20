import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shortLinks } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /s/<code> — resolve a short code and 307-redirect to its internal page.
// Unknown codes fall back to the homepage. Click count is bumped best-effort
// (never blocks the redirect).
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    const row = await db
      .select({ id: shortLinks.id, targetPath: shortLinks.targetPath })
      .from(shortLinks)
      .where(eq(shortLinks.code, code))
      .limit(1);

    if (!row[0]) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Best-effort click tally — fire and forget.
    db.update(shortLinks)
      .set({ clicks: sql`${shortLinks.clicks} + 1` })
      .where(eq(shortLinks.id, row[0].id))
      .catch(() => {});

    // targetPath is a validated same-origin path; resolve against this origin.
    return NextResponse.redirect(new URL(row[0].targetPath, request.url), 307);
  } catch (error) {
    console.error('GET /s/[code] error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
