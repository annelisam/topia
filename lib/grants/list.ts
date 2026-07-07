import { db, grants } from '@/lib/db';
import { desc, asc, ilike, or, and, eq } from 'drizzle-orm';

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

/**
 * Published, non-expired grants. Shared by /api/grants and the
 * server-rendered /resources/grants page.
 */
export async function getGrantsList({
  search,
  tag,
  sortBy,
}: {
  search?: string | null;
  tag?: string | null;
  sortBy?: string | null;
} = {}) {
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

  let orderByClause;
  switch (sortBy || 'deadline-asc') {
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

  return results.filter((g) => !isHiddenClosed(g));
}
