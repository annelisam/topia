import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type TargetList = 'saved' | 'using';

const COLUMN_FOR: Record<TargetList, 'savedToolSlugs' | 'toolSlugs'> = {
  saved: 'savedToolSlugs',
  using: 'toolSlugs',
};

/**
 * POST /api/tools/save
 * Body: { privyId: string, slug: string, action: 'save' | 'unsave', target?: 'saved' | 'using' }
 *
 * Toggles whether the given tool slug is in either:
 *   - the user's saved bookmarks (target='saved', default), OR
 *   - the user's "tools I use" list (target='using'), which feeds the public profile.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, slug, action } = body as { privyId?: string; slug?: string; action?: string };
    const target = (body.target as TargetList | undefined) ?? 'saved';

    if (!privyId || !slug || (action !== 'save' && action !== 'unsave') || !(target in COLUMN_FOR)) {
      return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 });
    }

    const column = COLUMN_FOR[target];

    const [existing] = await db
      .select({ id: users.id, current: users[column] })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const set = new Set(
      (existing.current ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    );

    if (action === 'save') set.add(slug);
    else set.delete(slug);

    const next = [...set].join(',') || null;

    await db.update(users)
      .set({ [column]: next, updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    return NextResponse.json({
      target,
      enabled: set.has(slug),
      list: next,
    });
  } catch (error) {
    console.error('Save/use tool error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tools/save?privyId=...
 * Returns both lists so callers can render both ★ saved and ✓ using state.
 */
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!privyId) return NextResponse.json({ savedToolSlugs: [], toolSlugs: [] });

    const [user] = await db
      .select({ savedToolSlugs: users.savedToolSlugs, toolSlugs: users.toolSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    const saved = (user?.savedToolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const using = (user?.toolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return NextResponse.json({ savedToolSlugs: saved, toolSlugs: using });
  } catch (error) {
    console.error('Saved tools fetch error:', error);
    return NextResponse.json({ savedToolSlugs: [], toolSlugs: [] });
  }
}
