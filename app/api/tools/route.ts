import { NextResponse } from 'next/server';
import { db, tools } from '@/lib/db';
import { like, or, asc, desc } from 'drizzle-orm';

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
      conditions.push(like(tools.category, `%${category}%`));
    }

    if (search) {
      conditions.push(
        or(
          like(tools.name, `%${search}%`),
          like(tools.description, `%${search}%`),
          like(tools.category, `%${search}%`)
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
