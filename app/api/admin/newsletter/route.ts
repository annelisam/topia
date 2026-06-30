import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { newsletterSignups, users } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { isAdminRequest } from '@/lib/adminAuth';

// GET – all newsletter / waitlist sign-ups, newest first. Each row is matched
// live (case-insensitive email) to a profile so attribution stays current even
// for profiles created after the signup.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = await db
      .select({
        id: newsletterSignups.id,
        email: newsletterSignups.email,
        name: newsletterSignups.name,
        source: newsletterSignups.source,
        roles: newsletterSignups.roles,
        createdAt: newsletterSignups.createdAt,
        userId: users.id,
        username: users.username,
        userName: users.name,
      })
      .from(newsletterSignups)
      .leftJoin(users, sql`lower(${users.email}) = lower(${newsletterSignups.email})`)
      .orderBy(desc(newsletterSignups.createdAt));

    return NextResponse.json({ signups: rows });
  } catch (error) {
    console.error('Admin GET newsletter:', error);
    return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 });
  }
}

// DELETE – remove a sign-up by id.
export async function DELETE(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.delete(newsletterSignups).where(sql`${newsletterSignups.id} = ${id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin DELETE newsletter:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
