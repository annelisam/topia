import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE – owner-only world deletion
export async function DELETE(request: NextRequest) {
  try {
    const { privyId, worldId } = await request.json();
    if (!privyId || !worldId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve caller
    const [caller] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!caller) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify caller is owner
    const [membership] = await db
      .select({ role: worldMembers.role })
      .from(worldMembers)
      .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id)))
      .limit(1);

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can delete a world' }, { status: 403 });
    }

    // Verify world exists
    const [world] = await db.select({ id: worlds.id }).from(worlds).where(eq(worlds.id, worldId)).limit(1);
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    // Delete world (cascade will handle worldMembers, worldInvitations, worldProjects)
    await db.delete(worlds).where(eq(worlds.id, worldId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete world error:', error);
    return NextResponse.json({ error: 'Failed to delete world' }, { status: 500 });
  }
}
