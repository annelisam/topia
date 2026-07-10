import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldInvitations, notifications } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** The ghost-invite claim flow (/invite/world/<token>).
 * GET  ?token=…            → who invited you to what, for the landing page
 * POST { token, privyId }  → resolve-or-create the claimer, add membership,
 *                            flip the invitation, notify the inviter. */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const inviters = alias(users, 'inviters');
    const [inv] = await db
      .select({
        id: worldInvitations.id,
        status: worldInvitations.status,
        role: worldInvitations.role,
        name: worldInvitations.name,
        worldTitle: worlds.title,
        worldSlug: worlds.slug,
        worldImageUrl: worlds.imageUrl,
        inviterName: inviters.name,
        inviterUsername: inviters.username,
      })
      .from(worldInvitations)
      .innerJoin(worlds, eq(worldInvitations.worldId, worlds.id))
      .leftJoin(inviters, eq(worldInvitations.inviterId, inviters.id))
      .where(eq(worldInvitations.token, token))
      .limit(1);
    if (!inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

    return NextResponse.json({ invitation: inv }, { headers: NO_STORE });
  } catch (error) {
    console.error('[world-claim] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load invitation' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, privyId } = await request.json();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    if (!privyId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [inv] = await db.select().from(worldInvitations)
      .where(eq(worldInvitations.token, token)).limit(1);
    if (!inv) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (inv.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation was already used' }, { status: 409 });
    }

    // Resolve-or-create the claimer (they may have authenticated seconds ago
    // and have no users row yet) — same pattern as the RSVP flow.
    let [claimer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!claimer) {
      try {
        [claimer] = await db.insert(users)
          .values({ privyId, email: inv.email ?? null, name: inv.name ?? null })
          .returning({ id: users.id });
      } catch {
        // Unique race on privyId/email — adopt the existing row.
        [claimer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
        if (!claimer && inv.email) {
          const [byEmail] = await db.select({ id: users.id }).from(users)
            .where(sql`lower(${users.email}) = ${inv.email.toLowerCase()}`).limit(1);
          if (byEmail) {
            await db.update(users).set({ privyId, updatedAt: new Date() }).where(eq(users.id, byEmail.id));
            claimer = byEmail;
          }
        }
      }
    }
    if (!claimer) return NextResponse.json({ error: 'Could not resolve your account' }, { status: 500 });

    // Membership (skip if somehow already in), then flip the invitation.
    const [existing] = await db.select({ id: worldMembers.id }).from(worldMembers)
      .where(and(eq(worldMembers.worldId, inv.worldId), eq(worldMembers.userId, claimer.id))).limit(1);
    if (!existing) {
      await db.insert(worldMembers).values({ worldId: inv.worldId, userId: claimer.id, role: inv.role });
    }
    await db.update(worldInvitations)
      .set({ inviteeId: claimer.id, status: 'accepted', updatedAt: new Date() })
      .where(eq(worldInvitations.id, inv.id));

    const [world] = await db.select({ title: worlds.title, slug: worlds.slug }).from(worlds).where(eq(worlds.id, inv.worldId)).limit(1);

    // Tell the inviter their ghost claimed the credit (best-effort).
    try {
      await db.insert(notifications).values({
        recipientId: inv.inviterId,
        actorId: claimer.id,
        type: 'world_invite_accepted',
        metadata: { worldId: inv.worldId, worldTitle: world?.title ?? '', worldSlug: world?.slug ?? '', role: inv.role, invitationId: inv.id },
      });
    } catch (err) {
      console.error('[world-claim] notify failed:', err);
    }

    return NextResponse.json({ ok: true, worldSlug: world?.slug ?? null, worldTitle: world?.title ?? null }, { headers: NO_STORE });
  } catch (error) {
    console.error('[world-claim] POST failed:', error);
    return NextResponse.json({ error: 'Failed to claim invitation' }, { status: 500 });
  }
}
