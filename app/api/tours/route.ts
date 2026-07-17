import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const TOUR_KEYS = new Set(['inprocess', 'world-hq', 'profile']);

// GET /api/tours?privyId=X — which first-run walkthroughs this user has seen.
export async function GET(request: Request) {
  try {
    const privyId = new URL(request.url).searchParams.get('privyId');
    if (!privyId) return NextResponse.json({ error: 'privyId is required' }, { status: 400 });
    const [user] = await db.select({ toursSeen: users.toursSeen }).from(users)
      .where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json({ seen: Array.isArray(user.toursSeen) ? user.toursSeen : [] }, { headers: NO_STORE });
  } catch (error) {
    console.error('[tours] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load tours' }, { status: 500 });
  }
}

// POST /api/tours — { privyId, tour } marks a walkthrough done (finished OR
// skipped — either way it never auto-shows again).
export async function POST(request: Request) {
  try {
    const { privyId, tour } = await request.json();
    if (!privyId || !TOUR_KEYS.has(String(tour))) {
      return NextResponse.json({ error: 'A valid tour key is required' }, { status: 400 });
    }
    const [user] = await db.select({ id: users.id, toursSeen: users.toursSeen }).from(users)
      .where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const seen = Array.isArray(user.toursSeen) ? (user.toursSeen as string[]) : [];
    if (!seen.includes(tour)) {
      await db.update(users)
        .set({ toursSeen: [...seen, tour], updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[tours] POST failed:', error);
    return NextResponse.json({ error: 'Failed to save the tour state' }, { status: 500 });
  }
}
