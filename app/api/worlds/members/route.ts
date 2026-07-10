import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldInvitations, notifications } from '@/lib/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { sendRawEmail } from '@/lib/notify/email';

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

/* ── POST – invite to a world ─────────────────────────────────
   Two shapes: { targetUserId } for platform users (unchanged), or
   { email, name } for people who aren't on Topia yet — their name shows
   as a pending credit immediately and they claim via an emailed link. */

export async function POST(request: NextRequest) {
  try {
    const { privyId, worldId, targetUserId, role, email, name } = await request.json();
    if (!privyId || !worldId || !role || (!targetUserId && !email)) {
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

    // ── Ghost invite by email ──
    if (!targetUserId && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanName = String(name ?? '').trim();
      if (!/.+@.+\..+/.test(cleanEmail)) {
        return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
      }
      if (!cleanName) {
        return NextResponse.json({ error: 'Add their name — it shows on the world right away' }, { status: 400 });
      }

      // If that email already belongs to a Topia user, fall through to the
      // normal user-invite path below so they get the in-app notification.
      const [existingUser] = await db.select({ id: users.id })
        .from(users).where(sql`lower(${users.email}) = ${cleanEmail}`).limit(1);
      if (!existingUser) {
      const [dupe] = await db.select({ id: worldInvitations.id }).from(worldInvitations)
        .where(and(
          eq(worldInvitations.worldId, worldId),
          sql`lower(${worldInvitations.email}) = ${cleanEmail}`,
          eq(worldInvitations.status, 'pending'),
        )).limit(1);
      if (dupe) return NextResponse.json({ error: 'That email already has a pending invitation' }, { status: 409 });

      const token = randomBytes(24).toString('base64url');
      const [invitation] = await db.insert(worldInvitations).values({
        worldId, inviterId: caller.id, inviteeId: null,
        email: cleanEmail, name: cleanName, token, role,
      }).returning();

      const [world] = await db.select({ title: worlds.title, slug: worlds.slug }).from(worlds).where(eq(worlds.id, worldId)).limit(1);
      const [inviter] = await db.select({ name: users.name, username: users.username }).from(users).where(eq(users.id, caller.id)).limit(1);

      // Best-effort email — never fail the invite because the send failed.
      const origin = request.nextUrl.origin;
      const claimUrl = `${origin}/invite/world/${token}`;
      const inviterName = inviter?.name || inviter?.username || 'A world builder';
      const result = await sendRawEmail({
        to: cleanEmail,
        subject: `${inviterName} credited you on ${world?.title ?? 'a world'} — claim your spot on TOPIA`,
        html: `<div style="font-family:Arial,sans-serif;background:#1a1a1a;color:#f5f0e8;padding:32px;border-radius:12px;max-width:520px;margin:0 auto">
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e4fe52;margin:0 0 16px">TOPIA // WORLD INVITATION</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 12px"><strong>${inviterName}</strong> added you to <strong>${world?.title ?? 'their world'}</strong> as a ${role === 'world_builder' ? 'builder' : 'collaborator'}.</p>
          <p style="font-size:14px;line-height:1.6;color:#bdb8ae;margin:0 0 24px">Your name is already on the world. Claim it to link your profile and join the crew.</p>
          <a href="${claimUrl}" style="display:inline-block;background:#e4fe52;color:#1a1a1a;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">Claim your credit →</a>
          <p style="font-size:11px;color:#8a867d;margin:24px 0 0">Sent by TOPIA (topia.vision). If this wasn't meant for you, ignore it.</p>
        </div>`,
      });
      if (!result.sent) console.error('[world-invite] email not sent:', result.reason);

      return NextResponse.json({ ok: true, invitationId: invitation.id, emailSent: result.sent, claimUrl });
      }
    }

    // ── Platform-user invite (targetUserId given, or resolved from email) ──
    const resolvedTargetId: string | undefined = targetUserId
      ?? (email ? (await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${String(email).trim().toLowerCase()}`).limit(1))[0]?.id : undefined);
    if (!resolvedTargetId) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, resolvedTargetId)).limit(1);
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    const [existing] = await db
      .select({ id: worldMembers.id })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, resolvedTargetId)))
      .limit(1);
    if (existing) return NextResponse.json({ error: 'User is already a member of this world' }, { status: 409 });

    const [existingInvite] = await db
      .select({ id: worldInvitations.id, status: worldInvitations.status })
      .from(worldInvitations)
      .where(and(eq(worldInvitations.worldId, worldId), eq(worldInvitations.inviteeId, resolvedTargetId), ne(worldInvitations.status, 'declined')))
      .limit(1);
    if (existingInvite) {
      const msg = existingInvite.status === 'pending' ? 'User already has a pending invitation' : 'User has already accepted an invitation';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const [invitation] = await db.insert(worldInvitations).values({ worldId, inviterId: caller.id, inviteeId: resolvedTargetId, role }).returning();

    const [world] = await db.select({ title: worlds.title, slug: worlds.slug }).from(worlds).where(eq(worlds.id, worldId)).limit(1);

    await db.insert(notifications).values({
      recipientId: resolvedTargetId,
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
