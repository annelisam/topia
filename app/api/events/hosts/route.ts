import { NextRequest, NextResponse } from 'next/server';
import { db, users, eventHosts, eventHostInvitations, events, notifications } from '@/lib/db';
import { eq, and, or, ilike, count } from 'drizzle-orm';

// POST /api/events/hosts — invite a co-host
export async function POST(request: NextRequest) {
  try {
    const { privyId, eventId, targetUserId, manager, showOnEventPage } = await request.json();

    if (!privyId || !eventId || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve inviter
    const [inviter] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!inviter) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify inviter is a host (and capture their role).
    const [isHost] = await db.select({ id: eventHosts.id, role: eventHosts.role }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, inviter.id)));
    if (!isHost) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    // Only the event's main host (creator) can auto-approve co-hosts; a co-host
    // inviting someone still goes through the pending-invitation flow.
    const isCreator = isHost.role === 'creator';

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

    // Check for an existing pending invitation. A co-host re-inviting hits a
    // 409, but the creator can auto-approve an outstanding pending invite
    // (e.g. one created before they became the main host) instead of erroring.
    const [existingInvite] = await db.select({ id: eventHostInvitations.id }).from(eventHostInvitations)
      .where(and(
        eq(eventHostInvitations.eventId, eventId),
        eq(eventHostInvitations.inviteeId, targetUserId),
        eq(eventHostInvitations.status, 'pending'),
      ));
    if (existingInvite && !isCreator) {
      return NextResponse.json({ error: 'Invitation already pending' }, { status: 409 });
    }

    // Record the invitation. When the creator invites, it's auto-accepted and
    // the target is added as a co-host immediately (no acceptance needed).
    // Reuse an existing pending invite if there is one rather than duplicating.
    let invitation;
    if (existingInvite) {
      [invitation] = await db.update(eventHostInvitations)
        .set({ status: 'accepted', inviterId: inviter.id, updatedAt: new Date() })
        .where(eq(eventHostInvitations.id, existingInvite.id))
        .returning();
    } else {
      [invitation] = await db.insert(eventHostInvitations).values({
        eventId,
        inviterId: inviter.id,
        inviteeId: targetUserId,
        status: isCreator ? 'accepted' : 'pending',
        ...(isCreator ? { updatedAt: new Date() } : {}),
      }).returning();
    }

    // Get event details for notification
    const [event] = await db.select({
      eventName: events.eventName,
      slug: events.slug,
    }).from(events).where(eq(events.id, eventId));

    if (isCreator) {
      // Auto-approve: add directly as co-host and tell them they're on the team.
      await db.insert(eventHosts).values({
        eventId,
        userId: targetUserId,
        role: 'co_host',
        manager: manager !== false,                  // default Manager unless explicitly false
        showOnEventPage: showOnEventPage !== false,   // default visible
      });
      if (event) {
        await db.insert(notifications).values({
          recipientId: targetUserId,
          actorId: inviter.id,
          type: 'event_cohost_added',
          metadata: {
            eventId,
            eventName: event.eventName,
            eventSlug: event.slug,
            invitationId: invitation.id,
          },
        });
      }
      return NextResponse.json({ invitation, autoApproved: true }, { status: 201 });
    }

    // Otherwise: notify the invitee that they have a pending invite to accept.
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

    return NextResponse.json({ invitation, autoApproved: false }, { status: 201 });
  } catch (error) {
    console.error('POST event host invite:', error);
    return NextResponse.json({ error: 'Failed to invite co-host' }, { status: 500 });
  }
}

// PUT /api/events/hosts — set the presenting World (only the creator/main host)
// Body: { privyId, eventId, worldId }  (worldId '' / null = personal, no world)
export async function PUT(request: NextRequest) {
  try {
    const { privyId, eventId, worldId } = await request.json();
    if (!privyId || !eventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [host] = await db.select({ id: eventHosts.id, role: eventHosts.role }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, user.id)));
    if (!host) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    if (host.role !== 'creator') {
      return NextResponse.json({ error: 'Only the main host can set the presenting world' }, { status: 403 });
    }

    await db.update(eventHosts).set({ worldId: worldId || null }).where(eq(eventHosts.id, host.id));
    return NextResponse.json({ ok: true, worldId: worldId || null });
  } catch (error) {
    console.error('PUT event host world:', error);
    return NextResponse.json({ error: 'Failed to set presenting world' }, { status: 500 });
  }
}

// Resolve the requester and confirm they are the event's creator (main host).
async function requireCreator(privyId: string, eventId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId));
  if (!user) return { error: 'User not found', status: 404 as const };
  const [host] = await db.select({ role: eventHosts.role }).from(eventHosts)
    .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, user.id)));
  if (!host || host.role !== 'creator') return { error: 'Only the main host can manage hosts', status: 403 as const };
  return { userId: user.id };
}

// PATCH /api/events/hosts — update a host's settings (creator only)
// Body: { privyId, eventId, hostUserId, showOnEventPage?, manager? }
export async function PATCH(request: NextRequest) {
  try {
    const { privyId, eventId, hostUserId, showOnEventPage, manager } = await request.json();
    if (!privyId || !eventId || !hostUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const auth = await requireCreator(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [target] = await db.select({ id: eventHosts.id, role: eventHosts.role }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, hostUserId)));
    if (!target) return NextResponse.json({ error: 'Host not found' }, { status: 404 });

    const patch: { showOnEventPage?: boolean; manager?: boolean } = {};
    if (typeof showOnEventPage === 'boolean') patch.showOnEventPage = showOnEventPage;
    // The creator is always a manager — only co-hosts can be set to non-manager.
    if (typeof manager === 'boolean' && target.role !== 'creator') patch.manager = manager;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    await db.update(eventHosts).set(patch).where(eq(eventHosts.id, target.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH event host:', error);
    return NextResponse.json({ error: 'Failed to update host' }, { status: 500 });
  }
}

// DELETE /api/events/hosts?privyId=&eventId=&hostUserId=  (creator only; not the creator themselves)
export async function DELETE(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const privyId = sp.get('privyId');
    const eventId = sp.get('eventId');
    const hostUserId = sp.get('hostUserId');
    if (!privyId || !eventId || !hostUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const auth = await requireCreator(privyId, eventId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [target] = await db.select({ id: eventHosts.id, role: eventHosts.role }).from(eventHosts)
      .where(and(eq(eventHosts.eventId, eventId), eq(eventHosts.userId, hostUserId)));
    if (!target) return NextResponse.json({ error: 'Host not found' }, { status: 404 });
    if (target.role === 'creator') return NextResponse.json({ error: "Can't remove the main host" }, { status: 400 });

    await db.delete(eventHosts).where(eq(eventHosts.id, target.id));
    // Clear any lingering invitation so they could be re-invited cleanly.
    await db.delete(eventHostInvitations)
      .where(and(eq(eventHostInvitations.eventId, eventId), eq(eventHostInvitations.inviteeId, hostUserId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE event host:', error);
    return NextResponse.json({ error: 'Failed to remove host' }, { status: 500 });
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
