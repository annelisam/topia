import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const privyId = request.nextUrl.searchParams.get('privyId');

    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
