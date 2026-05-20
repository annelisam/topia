import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows, worldMembers, eventHosts, events, worlds } from '@/lib/db/schema';
import { eq, and, gte, count, or } from 'drizzle-orm';

/**
 * GET /api/dashboard/stats?privyId=...
 * Returns aggregate counts + "new this month" deltas for the dashboard
 * stats bar. All counts are cheap COUNT(*) queries.
 */
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!privyId) return NextResponse.json({ followers: 0, following: 0, worlds: 0, events: 0, deltas: {} });

  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ followers: 0, following: 0, worlds: 0, events: 0, deltas: {} });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run independent counts in parallel
    const [
      [{ value: followers }],
      [{ value: following }],
      [{ value: followersDelta }],
      [{ value: worldsCount }],
      [{ value: worldsDelta }],
      [{ value: eventsCount }],
      [{ value: eventsDelta }],
    ] = await Promise.all([
      db.select({ value: count() }).from(follows).where(eq(follows.followingId, user.id)),
      db.select({ value: count() }).from(follows).where(eq(follows.followerId, user.id)),
      db.select({ value: count() }).from(follows).where(and(eq(follows.followingId, user.id), gte(follows.createdAt, thirtyDaysAgo))),
      db.select({ value: count() }).from(worldMembers).where(eq(worldMembers.userId, user.id)),
      db.select({ value: count() }).from(worldMembers).innerJoin(worlds, eq(worldMembers.worldId, worlds.id)).where(and(eq(worldMembers.userId, user.id), gte(worldMembers.createdAt, thirtyDaysAgo))),
      db.select({ value: count() }).from(events).leftJoin(eventHosts, eq(events.id, eventHosts.eventId)).where(or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id))),
      db.select({ value: count() }).from(events).leftJoin(eventHosts, eq(events.id, eventHosts.eventId)).where(and(or(eq(events.createdBy, user.id), eq(eventHosts.userId, user.id)), gte(events.createdAt, thirtyDaysAgo))),
    ]);

    return NextResponse.json({
      followers,
      following,
      worlds: worldsCount,
      events: eventsCount,
      deltas: {
        followers: followersDelta,
        worlds: worldsDelta,
        events: eventsDelta,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ followers: 0, following: 0, worlds: 0, events: 0, deltas: {} });
  }
}
