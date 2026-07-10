import { db } from './db';
import { reactions } from './db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export interface ReactionSummary {
  emoji: string;
  count: number;
  /** True when the viewer (passed via viewerId) has reacted with this emoji. */
  viewerReacted: boolean;
}

/**
 * Fetch reactions for a batch of targets and group them by target id +
 * emoji with counts + the viewer's own reaction flag. Used by the comments
 * and guestbook GET handlers so the UI can render reaction pills in one
 * round-trip.
 */
export async function getReactionsForTargets(
  targetType: 'guestbook' | 'tool_comment' | 'event_comment' | 'event_photo' | 'world_post',
  targetIds: string[],
  viewerId: string | null,
): Promise<Record<string, ReactionSummary[]>> {
  if (targetIds.length === 0) return {};

  const rows = await db
    .select({
      targetId: reactions.targetId,
      emoji: reactions.emoji,
      userId: reactions.userId,
    })
    .from(reactions)
    .where(and(eq(reactions.targetType, targetType), inArray(reactions.targetId, targetIds)));

  // First pass: group by (targetId, emoji) → { count, mine }
  const map: Record<string, Map<string, { count: number; mine: boolean }>> = {};
  for (const r of rows) {
    if (!map[r.targetId]) map[r.targetId] = new Map();
    const cur = map[r.targetId].get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (viewerId && r.userId === viewerId) cur.mine = true;
    map[r.targetId].set(r.emoji, cur);
  }

  // Stable emoji order — same as the picker palette
  const ORDER = ['❤️', '🔥', '👍', '😂', '👀', '🎉'];
  const result: Record<string, ReactionSummary[]> = {};
  for (const [tid, byEmoji] of Object.entries(map)) {
    const summaries: ReactionSummary[] = [];
    for (const emoji of ORDER) {
      const v = byEmoji.get(emoji);
      if (v) summaries.push({ emoji, count: v.count, viewerReacted: v.mine });
    }
    // Any emoji outside ORDER (shouldn't happen given the allow-list)
    for (const [emoji, v] of byEmoji) {
      if (!ORDER.includes(emoji)) summaries.push({ emoji, count: v.count, viewerReacted: v.mine });
    }
    result[tid] = summaries;
  }
  return result;
}
