import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/events/save
 * Body: { privyId, slug, action: 'save' | 'unsave' }
 * Toggles the event slug in users.saved_event_slugs CSV.
 */
export async function POST(request: NextRequest) {
  try {
    const { privyId, slug, action } = await request.json();
    if (!privyId || !slug || (action !== 'save' && action !== 'unsave')) {
      return NextResponse.json({ error: 'Missing/invalid fields' }, { status: 400 });
    }
    const [existing] = await db
      .select({ id: users.id, savedEventSlugs: users.savedEventSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const set = new Set(
      (existing.savedEventSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    );
    if (action === 'save') set.add(slug); else set.delete(slug);
    const next = [...set].join(',') || null;

    await db.update(users)
      .set({ savedEventSlugs: next, updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    return NextResponse.json({ saved: set.has(slug) });
  } catch (error) {
    console.error('Save event error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** GET /api/events/save?privyId=... — returns saved slug list */
export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');
    if (!privyId) return NextResponse.json({ savedEventSlugs: [] });
    const [u] = await db
      .select({ savedEventSlugs: users.savedEventSlugs })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    const slugs = (u?.savedEventSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return NextResponse.json({ savedEventSlugs: slugs });
  } catch {
    return NextResponse.json({ savedEventSlugs: [] });
  }
}
