import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldInvitations, notifications } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/* ── Helpers ─────────────────────────────────────────────────── */

async function resolveUser(privyId: string) {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  return u ?? null;
}

async function getMembership(worldId: string, userId: string) {
  const [m] = await db
    .select({ id: worldMembers.id, role: worldMembers.role })
    .from(worldMembers)
    .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, userId)))
    .limit(1);
  return m ?? null;
}

function canManage(callerRole: string) {
  return callerRole === 'owner' || callerRole === 'world_builder';
}

/* ── POST – invite a user to a world ─────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId, role } = await request.json();
    if (!privyId || !worldId || !targetUserId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['world_builder', 'collaborator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const caller = await resolveUser(privyId);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const membership = await getMembership(worldId, caller.id);
    if (!membership || !canManage(membership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only owner can invite as world_builder
    if (role === 'world_builder' && membership.role !== 'owner') {
      // Builders can still invite as builder (per user clarification: builders can promote collab→builder)
      // But for invites, builders can invite as builder or collaborator
    }

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    const [existing] = await db
      .select({ id: worldMembers.id })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)))
      .limit(1);
    if (existing) return NextResponse.json({ error: 'User is already a member of this world' }, { status: 409 });

    const [existingInvite] = await db
      .select({ id: worldInvitations.id, status: worldInvitations.status })
      .from(worldInvitations)
      .where(and(eq(worldInvitations.worldId, worldId), eq(worldInvitations.inviteeId, targetUserId), ne(worldInvitations.status, 'declined')))
      .limit(1);
    if (existingInvite) {
      const msg = existingInvite.status === 'pending' ? 'User already has a pending invitation' : 'User has already accepted an invitation';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const [invitation] = await db.insert(worldInvitations).values({ worldId, inviterId: caller.id, inviteeId: targetUserId, role }).returning();

    const [world] = await db.select({ title: worlds.title, slug: worlds.slug }).from(worlds).where(eq(worlds.id, worldId)).limit(1);

    await db.insert(notifications).values({
      recipientId: targetUserId,
      actorId: caller.id,
      type: 'world_invite',
      metadata: { worldId, worldTitle: world?.title ?? 'Unknown', worldSlug: world?.slug ?? '', role, invitationId: invitation.id },
    });

    return NextResponse.json({ ok: true, invitationId: invitation.id });
  } catch (error) {
    console.error('Invite world member error:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

/* ── PUT – change a member's role ────────────────────────────── */

export async function PUT(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId, newRole } = await request.json();
    if (!privyId || !worldId || !targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['world_builder', 'collaborator'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role. Cannot assign owner.' }, { status: 400 });
    }

    const caller = await resolveUser(privyId);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const callerMembership = await getMembership(worldId, caller.id);
    if (!callerMembership || !canManage(callerMembership.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const targetMembership = await getMembership(worldId, targetUserId);
    if (!targetMembership) {
      return NextResponse.json({ error: 'Target is not a member' }, { status: 404 });
    }

    // Cannot change owner's role
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 403 });
    }

    // Builders can only promote collaborator → builder, not demote builders
    if (callerMembership.role === 'world_builder') {
      if (targetMembership.role === 'world_builder') {
        return NextResponse.json({ error: 'Builders cannot change other builders\' roles' }, { status: 403 });
      }
      if (newRole === 'collaborator') {
        // Builder demoting a collaborator to collaborator — no-op, but allow
      }
    }

    await db
      .update(worldMembers)
      .set({ role: newRole })
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Change member role error:', error);
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
  }
}

/* ── DELETE – remove a member or leave a world ───────────────── */

export async function DELETE(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId } = await request.json();
    if (!privyId || !worldId || !targetUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const caller = await resolveUser(privyId);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const callerMembership = await getMembership(worldId, caller.id);
    if (!callerMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const isSelf = targetUserId === caller.id;

    if (isSelf) {
      // === LEAVE ===
      // Owners cannot leave
      if (callerMembership.role === 'owner') {
        return NextResponse.json({ error: 'Owner cannot leave the world. Transfer ownership or delete the world.' }, { status: 400 });
      }
      // Builders and collaborators can leave
      await db.delete(worldMembers).where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id)));
      return NextResponse.json({ ok: true });
    }

    // === REMOVE SOMEONE ELSE ===
    const targetMembership = await getMembership(worldId, targetUserId);
    if (!targetMembership) return NextResponse.json({ error: 'Target is not a member' }, { status: 404 });

    // Owner can remove anyone (except themselves, handled above)
    if (callerMembership.role === 'owner') {
      await db.delete(worldMembers).where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)));
      return NextResponse.json({ ok: true });
    }

    // Builder can only remove collaborators
    if (callerMembership.role === 'world_builder') {
      if (targetMembership.role === 'collaborator') {
        await db.delete(worldMembers).where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, targetUserId)));
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: 'Builders can only remove collaborators' }, { status: 403 });
    }

    // Collaborators cannot remove others
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  } catch (error) {
    console.error('Remove world member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
