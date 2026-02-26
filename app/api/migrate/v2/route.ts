/**
 * Migration v2 — adds metadata column to notifications, submitted_by to tools.
 * POST /api/migrate/v2 with { "secret": "topia-migrate-v2-2026" }
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

const MIGRATION_SECRET = 'topia-migrate-v2-2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.secret !== MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = [];

    try {
      await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb`);
      results.push('notifications.metadata added');
    } catch (e: any) {
      results.push(`notifications.metadata failed: ${e.message}`);
    }

    try {
      await db.execute(sql`ALTER TABLE tools ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES users(id)`);
      results.push('tools.submitted_by added');
    } catch (e: any) {
      results.push(`tools.submitted_by failed: ${e.message}`);
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
