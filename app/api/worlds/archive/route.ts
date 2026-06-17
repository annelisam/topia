import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/worlds/archive — owner-only archive (publish=false) / restore
// (publish=true). The user-facing "remove" for worlds: a recoverable soft hide
// rather than the permanent /api/worlds/delete.
export async function POST(request: NextRequest) {
  try {
    const { privyId, worldId, published } = await request.json();
    if (!privyId || !worldId || typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'privyId, worldId and published(boolean) are required' },
        { status: 400 },
      );
    }

    const [caller] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [membership] = await db
      .select({ role: worldMembers.role })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id)))
      .limit(1);

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can remove a world' }, { status: 403 });
    }

    const [updated] = await db
      .update(worlds)
      .set({ published, updatedAt: new Date() })
      .where(eq(worlds.id, worldId))
      .returning({ id: worlds.id, published: worlds.published });

    if (!updated) return NextResponse.json({ error: 'World not found' }, { status: 404 });
    return NextResponse.json({ ok: true, world: updated });
  } catch (error) {
    console.error('Archive world error:', error);
    return NextResponse.json({ error: 'Failed to update world' }, { status: 500 });
  }
}
