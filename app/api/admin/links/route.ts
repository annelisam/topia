import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shortLinks, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/adminAuth';

// GET /api/admin/links — all short links with click counts, most-clicked first.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await db
      .select({
        id: shortLinks.id,
        code: shortLinks.code,
        targetPath: shortLinks.targetPath,
        kind: shortLinks.kind,
        clicks: shortLinks.clicks,
        createdAt: shortLinks.createdAt,
        creatorName: users.name,
        creatorUsername: users.username,
      })
      .from(shortLinks)
      .leftJoin(users, eq(shortLinks.createdBy, users.id))
      .orderBy(desc(shortLinks.clicks), desc(shortLinks.createdAt));

    return NextResponse.json({ links: rows });
  } catch (error) {
    console.error('GET /api/admin/links error:', error);
    return NextResponse.json({ error: 'Failed to load links' }, { status: 500 });
  }
}
