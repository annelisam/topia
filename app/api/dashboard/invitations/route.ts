import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldInvitations, eventHostInvitations, events as eventsTable } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * GET /api/dashboard/invitations?privyId=...
 * Returns both pending world invitations and pending event-host invitations
 * for the user, joined with inviter + world/event metadata.
 */
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!privyId) return NextResponse.json({ worldInvitations: [], eventInvitations: [] });

  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ worldInvitations: [], eventInvitations: [] });

    // Use an alias so we can join the same `users` table for inviters
    const inviters = alias(users, 'inviters');

    const worldInvites = await db
      .select({
        id: worldInvitations.id,
        role: worldInvitations.role,
        createdAt: worldInvitations.createdAt,
        worldTitle: worlds.title,
        worldSlug: worlds.slug,
        worldImageUrl: worlds.imageUrl,
        inviterName: inviters.name,
        inviterUsername: inviters.username,
        inviterAvatar: inviters.avatarUrl,
      })
      .from(worldInvitations)
      .innerJoin(worlds, eq(worldInvitations.worldId, worlds.id))
      .innerJoin(inviters, eq(worldInvitations.inviterId, inviters.id))
      .where(and(eq(worldInvitations.inviteeId, user.id), eq(worldInvitations.status, 'pending')))
      .orderBy(desc(worldInvitations.createdAt));

    const eventInvites = await db
      .select({
        id: eventHostInvitations.id,
        createdAt: eventHostInvitations.createdAt,
        eventName: eventsTable.eventName,
        eventSlug: eventsTable.slug,
        eventImageUrl: eventsTable.imageUrl,
        eventDate: eventsTable.date,
        inviterName: inviters.name,
        inviterUsername: inviters.username,
        inviterAvatar: inviters.avatarUrl,
      })
      .from(eventHostInvitations)
      .innerJoin(eventsTable, eq(eventHostInvitations.eventId, eventsTable.id))
      .innerJoin(inviters, eq(eventHostInvitations.inviterId, inviters.id))
      .where(and(eq(eventHostInvitations.inviteeId, user.id), eq(eventHostInvitations.status, 'pending')))
      .orderBy(desc(eventHostInvitations.createdAt));

    return NextResponse.json({
      worldInvitations: worldInvites,
      eventInvitations: eventInvites,
      total: worldInvites.length + eventInvites.length,
    });
  } catch (error) {
    console.error('Invitations fetch error:', error);
    return NextResponse.json({ worldInvitations: [], eventInvitations: [], total: 0 });
  }
}
