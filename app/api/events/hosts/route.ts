import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventHosts, eventHostInvitations, events, notifications } from '@/lib/db';
import { eq, and, or, ilike, count } from 'drizzle-orm';

// POST /api/events/hosts — invite a co-host
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, targetUserId } = await request.json();

    if (!privyId || !eventId || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve inviter
    const [inviter] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!inviter) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify inviter is a host
    const [isHost] = await db.select({ id: eventHosts.id }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, inviter.id)));
    if (!isHost) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check max 5 co-hosts (total hosts including creator)
    const [hostCount] = await db.select({ count: count() }).from(eventHosts)
      .where(eq(eventHosts.eventId, eventId));
    if (hostCount.count >= 6) {
      return NextResponse.json({ error: 'Maximum 5 co-hosts reached' }, { status: 400 });
    }

    // Check if target is already a host
    const [alreadyHost] = await db.select({ id: eventHosts.id }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, targetUserId)));
    if (alreadyHost) {
      return NextResponse.json({ error: 'User is already a host' }, { status: 409 });
    }

    // Check for existing pending invitation
    const [existingInvite] = await db.select({ id: eventHostInvitations.id }).from(eventHostInvitations)
      .where(and(
        eq(eventHostInvitations.eventId, eventId),
        eq(eventHostInvitations.inviteeId, targetUserId),
        eq(eventHostInvitations.status, 'pending'),
      ));
    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already pending' }, { status: 409 });
    }

    // Create invitation
    const [invitation] = await db.insert(eventHostInvitations).values({
      eventId,
      inviterId: inviter.id,
      inviteeId: targetUserId,
      status: 'pending',
    }).returning();

    // Get event details for notification
    const [event] = await db.select({
      eventName: events.eventName,
      slug: events.slug,
    }).from(events).where(eq(events.id, eventId));

    // Notify the invitee
    if (event) {
      await db.insert(notifications).values({
        recipientId: targetUserId,
        actorId: inviter.id,
        type: 'event_cohost_invite',
        metadata: {
          eventId,
          eventName: event.eventName,
          eventSlug: event.slug,
          invitationId: invitation.id,
        },
      });
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('POST event host invite:', error);
    return NextResponse.json({ error: 'Failed to invite co-host' }, { status: 500 });
  }
}

// GET /api/events/hosts?search=X — search users by name/username for co-host invite
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search');
    if (!search || search.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const pattern = `%${search}%`;
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(or(ilike(users.username, pattern), ilike(users.name, pattern)))
      .limit(10);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('GET host search:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
