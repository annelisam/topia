import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldInvitations, notifications } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

// POST – invite a user to a world (creates pending invitation + notification)
export async function POST(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId, role } = await request.json();
    if (!privyId || !worldId || !targetUserId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['world_builder', 'collaborator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Resolve caller
    const [caller] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify caller is a world_builder of this world
    const [membership] = await db
      .select({ role: worldMembers.role })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id)))
      .limit(1);
    if (!membership || membership.role !== 'world_builder') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify target user exists
    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    // Check not already a member
    const [existing] = await db
      .select({ id: worldMembers.id })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this world' }, { status: 409 });
    }

    // Check for existing invitation (pending or accepted)
    const [existingInvite] = await db
      .select({ id: worldInvitations.id, status: worldInvitations.status })
      .from(worldInvitations)
      .where(and(
        eq(worldInvitations.worldId, worldId),
        eq(worldInvitations.inviteeId, targetUserId),
        ne(worldInvitations.status, 'declined')
      ))
      .limit(1);
    if (existingInvite) {
      const msg = existingInvite.status === 'pending'
        ? 'User already has a pending invitation'
        : 'User has already accepted an invitation';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Create invitation
    const [invitation] = await db.insert(worldInvitations).values({
      worldId,
      inviterId: caller.id,
      inviteeId: targetUserId,
      role,
    }).returning();

    // Get world info for notification metadata
    const [world] = await db
      .select({ title: worlds.title, slug: worlds.slug })
      .from(worlds)
      .where(eq(worlds.id, worldId))
      .limit(1);

    // Create notification for the invitee
    await db.insert(notifications).values({
      recipientId: targetUserId,
      actorId: caller.id,
      type: 'world_invite',
      metadata: {
        worldId,
        worldTitle: world?.title ?? 'Unknown',
        worldSlug: world?.slug ?? '',
        role,
        invitationId: invitation.id,
      },
    });

    return NextResponse.json({ ok: true, invitationId: invitation.id });
  } catch (error) {
    console.error('Invite world member error:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// DELETE – remove a member from a world
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId } = await request.json();
    if (!privyId || !worldId || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve caller
    const [caller] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify caller is a world_builder
    const [membership] = await db
      .select({ role: worldMembers.role })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id)))
      .limit(1);
    if (!membership || membership.role !== 'world_builder') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Prevent removing self if last world_builder
    if (targetUserId === caller.id) {
      const builders = await db
        .select({ id: worldMembers.id })
        .from(worldMembers)
        .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.role, 'world_builder')));
      if (builders.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last world builder' }, { status: 400 });
      }
    }

    // Remove member
    await db
      .delete(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Remove world member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
