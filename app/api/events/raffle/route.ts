import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, eventPrizes } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { requireManager } from '@/lib/events/auth';
import { getEventQuestProgress } from '@/lib/events/quests';

// POST /api/events/raffle — { privyId, eventId, prizeId }
// Draw a winner for a prize: a uniform random pick from guests who completed
// EVERY active quest. Redrawing overwrites (winner left, prize unclaimed).
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, prizeId } = await request.json();
    if (!eventId || !prizeId) {
      return NextResponse.json({ error: 'eventId and prizeId are required' }, { status: 400 });
    }
    const auth = await requireManager(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [prize] = await db.select().from(eventPrizes)
      .where(and(eq(eventPrizes.id, prizeId), eq(eventPrizes.eventId, eventId))).limit(1);
    if (!prize) return NextResponse.json({ error: 'Prize not found' }, { status: 404 });

    const { total, entries } = await getEventQuestProgress(eventId);
    if (total === 0) return NextResponse.json({ error: 'This event has no active quests' }, { status: 400 });
    const pool = entries.filter((e) => e.inRaffle);
    if (pool.length === 0) {
      return NextResponse.json({ error: 'No one has completed every quest yet' }, { status: 400 });
    }

    const winner = pool[randomInt(pool.length)];
    await db.update(eventPrizes)
      .set({ raffleWinnerUserId: winner.userId, drawnAt: new Date(), updatedAt: new Date() })
      .where(eq(eventPrizes.id, prizeId));

    return NextResponse.json(
      {
        ok: true,
        poolSize: pool.length,
        winner: { userId: winner.userId, name: winner.name, username: winner.username, avatarUrl: winner.avatarUrl },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[raffle] POST failed:', error);
    return NextResponse.json({ error: 'Failed to draw raffle' }, { status: 500 });
  }
}
