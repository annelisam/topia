import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldInvitations, notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST – accept or decline a world invitation
export async function POST(request: NextRequest) {
  try {
    const { privyId, invitationId, action } = await request.json();
    if (!privyId || !invitationId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Resolve caller
    const [caller] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get the invitation
    const [invitation] = await db
      .select()
      .from(worldInvitations)
      .where(and(eq(worldInvitations.id, invitationId), eq(worldInvitations.inviteeId, caller.id)))
      .limit(1);
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already responded to' }, { status: 409 });
    }

    if (action === 'accept') {
      // Check not already a member
      const [existing] = await db
        .select({ id: worldMembers.id })
        .from(worldMembers)
        .where(and(eq(worldMembers.worldId, invitation.worldId), eq(worldMembers.userId, caller.id)))
        .limit(1);

      if (!existing) {
        // Add as member
        await db.insert(worldMembers).values({
          worldId: invitation.worldId,
          userId: caller.id,
          role: invitation.role,
        });
      }

      // Update invitation status
      await db.update(worldInvitations)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(worldInvitations.id, invitationId));

      // Notify the inviter that the invite was accepted
      const [world] = await db
        .select({ title: worlds.title, slug: worlds.slug })
        .from(worlds)
        .where(eq(worlds.id, invitation.worldId))
        .limit(1);

      await db.insert(notifications).values({
        recipientId: invitation.inviterId,
        actorId: caller.id,
        type: 'world_invite_accepted',
        metadata: {
          worldId: invitation.worldId,
          worldTitle: world?.title ?? 'Unknown',
          worldSlug: world?.slug ?? '',
          role: invitation.role,
        },
      });

      return NextResponse.json({ ok: true, status: 'accepted' });
    } else {
      // Decline
      await db.update(worldInvitations)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(eq(worldInvitations.id, invitationId));

      return NextResponse.json({ ok: true, status: 'declined' });
    }
  } catch (error) {
    console.error('Invitation respond error:', error);
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
}
