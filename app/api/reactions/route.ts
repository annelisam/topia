import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, reactions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Polymorphic emoji reactions on guestbook entries + comments.
 *
 * POST /api/reactions  { privyId, targetType, targetId, emoji }
 *   → toggles the reaction (insert if missing, delete if present).
 *     Response: { reacting: boolean } — the *new* state for this user.
 *
 * GET is not exposed here; reactions are fetched alongside the parent
 * via the comments / guestbook endpoints (one round-trip).
 */
const ALLOWED_TARGET_TYPES = new Set(['guestbook', 'tool_comment', 'event_comment']);
// Curated quick reactions — keep this list short so the bar stays compact.
const ALLOWED_EMOJI = new Set(['❤️', '🔥', '👍', '😂', '👀', '🎉']);

export async function POST(request: NextRequest) {
  try {
    const { privyId, targetType, targetId, emoji } = await request.json();
    if (!privyId || !targetType || !targetId || !emoji) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!ALLOWED_TARGET_TYPES.has(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    }
    if (!ALLOWED_EMOJI.has(emoji)) {
      return NextResponse.json({ error: 'Emoji not in quick-react palette' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Look for an existing row → toggle
    const [existing] = await db
      .select({ id: reactions.id })
      .from(reactions)
      .where(and(
        eq(reactions.userId, user.id),
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.emoji, emoji),
      ))
      .limit(1);

    if (existing) {
      await db.delete(reactions).where(eq(reactions.id, existing.id));
      return NextResponse.json({ reacting: false });
    }
    await db.insert(reactions).values({
      userId: user.id,
      targetType,
      targetId,
      emoji,
    });
    return NextResponse.json({ reacting: true });
  } catch (error) {
    console.error('reactions toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
