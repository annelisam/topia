import { NextResponse } from 'next/server';
import { db, grants } from '@/lib/db';
import { sql } from '@vercel/postgres';
import { desc, asc, ilike, or } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const sortBy = searchParams.get('sortBy') || 'deadline-asc';

    // Build query
    let query = db.select().from(grants);

    // Apply filters
    let conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(grants.grantName, `%${search}%`),
          ilike(grants.shortDescription, `%${search}%`),
          ilike(grants.orgName, `%${search}%`),
          ilike(grants.tags, `%${search}%`)
        )
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

    // Execute query
    const results = await query
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(orderByClause);

    return NextResponse.json({
      grants: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching grants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    );
  }
}
