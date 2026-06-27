import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversationMembers, messages, notifications } from '@/lib/db/schema';
import { and, eq, ne, gt, or, isNull, sql } from 'drizzle-orm';
import { userIdFromPrivy } from '@/lib/messages';

// GET /api/me/badges?privyId=… — one lightweight request that backs every nav
// badge (messages unread + requests + notifications unread). Replaces the two
// separate always-on 30s polls so each logged-in user makes one call, not two.
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const me = await userIdFromPrivy(privyId);
  const empty = { messagesUnread: 0, requestCount: 0, notificationsUnread: 0 };
  if (!me) return NextResponse.json(empty);

  try {
    const [unread, requests, notif] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` })
        .from(messages)
        .innerJoin(conversationMembers, and(
          eq(conversationMembers.conversationId, messages.conversationId),
          eq(conversationMembers.userId, me),
          eq(conversationMembers.status, 'accepted'),
        ))
        .where(and(
          ne(messages.senderId, me),
          or(isNull(conversationMembers.lastReadAt), gt(messages.createdAt, conversationMembers.lastReadAt)),
        )),
      db.select({ n: sql<number>`count(distinct ${conversationMembers.conversationId})::int` })
        .from(conversationMembers)
        .innerJoin(messages, eq(messages.conversationId, conversationMembers.conversationId))
        .where(and(eq(conversationMembers.userId, me), eq(conversationMembers.status, 'pending'))),
      db.select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.recipientId, me), eq(notifications.read, false))),
    ]);
    return NextResponse.json({
      messagesUnread: unread[0]?.n ?? 0,
      requestCount: requests[0]?.n ?? 0,
      notificationsUnread: notif[0]?.n ?? 0,
    });
  } catch (error) {
    console.error('Badges GET error:', error);
    return NextResponse.json(empty);
  }
}
