import { NextResponse } from 'next/server';
import { db, tools } from '@/lib/db';
import { ilike, or, asc, desc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query
    let query = db.select().from(tools);

    // Apply filters
    let conditions = [];

    if (category && category !== 'all') {
      // Case-insensitive search for category
      conditions.push(ilike(tools.category, `%${category}%`));
    }

    if (search) {
      conditions.push(
        or(
          ilike(tools.name, `%${search}%`),
          ilike(tools.description, `%${search}%`),
          ilike(tools.category, `%${search}%`)
        )
      );
    }

    // Execute query - ordered by name by default
    const results = await query
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(asc(tools.name));

    return NextResponse.json({
      tools: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
