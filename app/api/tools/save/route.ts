import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/tools/save
 * Body: { privyId: string, slug: string, action: 'save' | 'unsave' }
 *
 * Toggles whether the given tool slug is in the user's savedToolSlugs CSV.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, slug, action } = body as { privyId?: string; slug?: string; action?: string };

    if (!privyId || !slug || (action !== 'save' && action !== 'unsave')) {
      return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: users.id, savedToolSlugs: users.savedToolSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const set = new Set(
      (existing.savedToolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    );

    if (action === 'save') set.add(slug);
    else set.delete(slug);

    const next = [...set].join(',') || null;

    await db.update(users)
      .set({ savedToolSlugs: next, updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    return NextResponse.json({ saved: set.has(slug), savedToolSlugs: next });
  } catch (error) {
    console.error('Save tool error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tools/save?privyId=...
 * Returns the user's full saved tool slug list.
 */
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!privyId) return NextResponse.json({ savedToolSlugs: [] });

    const [user] = await db
      .select({ savedToolSlugs: users.savedToolSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    const slugs = (user?.savedToolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return NextResponse.json({ savedToolSlugs: slugs });
  } catch (error) {
    console.error('Saved tools fetch error:', error);
    return NextResponse.json({ savedToolSlugs: [] });
  }
}
