import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversationMembers, messages } from '@/lib/db/schema';
import { and, eq, ne, gt, or, isNull, sql } from 'drizzle-orm';
import { userIdFromPrivy } from '@/lib/messages';

// GET /api/messages/unread?privyId=… — lightweight counts for the nav badge:
//   unreadTotal  → unread messages across accepted (Primary) threads
//   requestCount → number of pending (Request) threads that have a message
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const me = await userIdFromPrivy(privyId);
  if (!me) return NextResponse.json({ unreadTotal: 0, requestCount: 0 });

  try {
    const [unread] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversationMembers, and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, me),
        eq(conversationMembers.status, 'accepted'),
      ))
      .where(and(
        ne(messages.senderId, me),
        or(isNull(conversationMembers.lastReadAt), gt(messages.createdAt, conversationMembers.lastReadAt)),
      ));

    const [requests] = await db
      .select({ n: sql<number>`count(distinct ${conversationMembers.conversationId})::int` })
      .from(conversationMembers)
      .innerJoin(messages, eq(messages.conversationId, conversationMembers.conversationId))
      .where(and(eq(conversationMembers.userId, me), eq(conversationMembers.status, 'pending')));

    return NextResponse.json({ unreadTotal: unread?.n ?? 0, requestCount: requests?.n ?? 0 });
  } catch (error) {
    console.error('Unread GET error:', error);
    return NextResponse.json({ unreadTotal: 0, requestCount: 0 });
  }
}
