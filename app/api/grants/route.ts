import { NextResponse } from 'next/server';
import { db, grants } from '@/lib/db';
import { desc, asc, ilike, or, and, eq } from 'drizzle-orm';

// Public, viewer-independent list → CDN-cacheable (see /api/profiles).
const LIST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

// A grant whose deadline passed keeps its CLOSED badge on the list for this
// long, then drops off entirely — the list cleans itself as deadlines pass.
const CLOSED_GRACE_DAYS = 30;

// Hidden from the public list: explicitly Closed grants (discontinued
// programs — hidden immediately) and grants whose dated deadline passed more
// than the grace window ago. Rolling / "Varies" deadlines never expire here.
function isHiddenClosed(g: { status: string | null; deadlineDate: string | null }): boolean {
  if ((g.status ?? '').toLowerCase().includes('closed')) return true;
  if (!g.deadlineDate) return false;
  const d = new Date(g.deadlineDate);
  if (isNaN(d.getTime())) return false; // "Rolling", "Varies", …
  return d.getTime() < Date.now() - CLOSED_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const sortBy = searchParams.get('sortBy') || 'deadline-asc';

    // Only published grants are public — user submissions await admin review.
    const conditions = [eq(grants.published, true)];

    if (search) {
      conditions.push(
        or(
          ilike(grants.grantName, `%${search}%`),
          ilike(grants.shortDescription, `%${search}%`),
          ilike(grants.orgName, `%${search}%`),
          ilike(grants.tags, `%${search}%`)
        )!
      );
    }

    if (tag && tag !== 'all' && tag !== 'all tags') {
      conditions.push(ilike(grants.tags, `%${tag}%`));
    }

    // Apply sorting
    let orderByClause;
    switch (sortBy) {
      case 'deadline-desc':
        orderByClause = desc(grants.deadlineDate);
        break;
      case 'amount-desc':
        orderByClause = desc(grants.amountMax);
        break;
      case 'amount-asc':
        orderByClause = asc(grants.amountMin);
        break;
      case 'name-asc':
        orderByClause = asc(grants.grantName);
        break;
      case 'name-desc':
        orderByClause = desc(grants.grantName);
        break;
      default: // deadline-asc
        orderByClause = asc(grants.deadlineDate);
    }

    const results = await db
      .select()
      .from(grants)
      .where(and(...conditions))
      .orderBy(orderByClause);

    const visible = results.filter((g) => !isHiddenClosed(g));

    return NextResponse.json({
      grants: visible,
      count: visible.length,
    }, { headers: { 'Cache-Control': LIST_CACHE } });
  } catch (error) {
    console.error('Error fetching grants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    );
  }
}
