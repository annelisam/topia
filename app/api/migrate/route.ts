/**
 * One-time migration endpoint — adds role_tags and tool_slugs columns to users.
 * Visit POST /api/migrate with { "secret": "topia-migrate-2026" } once, then this route can be deleted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

const MIGRATION_SECRET = 'topia-migrate-2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.secret !== MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_tags text`);
      results.push('✓ role_tags column added (or already existed)');
    } catch (e: any) {
      results.push(`✗ role_tags: ${e.message}`);
    }

    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tool_slugs text`);
      results.push('✓ tool_slugs column added (or already existed)');
    } catch (e: any) {
      results.push(`✗ tool_slugs: ${e.message}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
