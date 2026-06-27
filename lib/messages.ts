// Shared helpers for the direct-message feature. Auth mirrors the rest of the
// app: the client passes its Privy DID, the server resolves it to a user row.
import { db } from '@/lib/db';
import { users, follows, conversationMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function userIdFromPrivy(privyId: string | null | undefined): Promise<string | null> {
  if (!privyId) return null;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  return u?.id ?? null;
}

// Deterministic key for a 1:1 pair so a pair can only have one conversation.
export function dmKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// A "connection" = mutual follow (both directions exist). Drives Primary vs
// Requests: a first message from a non-connection lands in the recipient's
// Requests until they accept.
export async function areMutual(a: string, b: string): Promise<boolean> {
  const [ab, ba] = await Promise.all([
    db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, a), eq(follows.followingId, b))).limit(1),
    db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, b), eq(follows.followingId, a))).limit(1),
  ]);
  return ab.length > 0 && ba.length > 0;
}

// My membership row for a conversation (or null if I'm not in it).
export async function membership(conversationId: string, userId: string) {
  const [m] = await db
    .select({ id: conversationMembers.id, status: conversationMembers.status, lastReadAt: conversationMembers.lastReadAt })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return m ?? null;
}
