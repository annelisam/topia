import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shortLinks } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ensureShortLink } from '@/lib/shortlinkStore';

export const runtime = 'nodejs';

// GET /u/<username> — the tracked target behind the /@username vanity URL
// (rewritten here by middleware). Bumps the profile link's click count, then
// 307-redirects to the canonical /profile/<username>.
export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = `/profile/${username}`;

  try {
    // Make sure a row exists (so the click lands somewhere + shows in admin).
    await ensureShortLink({ path: target, kind: 'profile' });
    await db
      .update(shortLinks)
      .set({ clicks: sql`${shortLinks.clicks} + 1` })
      .where(eq(shortLinks.targetPath, target));
  } catch {
    /* tracking is best-effort — never block the redirect */
  }

  return NextResponse.redirect(new URL(target, request.url), 307);
}
