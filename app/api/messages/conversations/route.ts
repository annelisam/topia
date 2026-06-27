import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, conversationMembers, messages, users } from '@/lib/db/schema';
import { and, eq, ne, inArray, desc, gt, or, isNull, sql } from 'drizzle-orm';
import { userIdFromPrivy, dmKey, areMutual } from '@/lib/messages';

// GET /api/messages/conversations?privyId=… — the inbox, split into Primary
// (accepted) and Requests (pending), each sorted by most-recent message.
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const me = await userIdFromPrivy(privyId);
  if (!me) return NextResponse.json({ primary: [], requests: [], requestCount: 0, unreadTotal: 0 });

  try {
    // The 100 most-recently-active conversations (ordered by recency *before*
    // limiting, so newer threads are never dropped). Bounds the inbox payload
    // for power users without any pagination UI.
    const myMems = await db
      .select({ conversationId: conversationMembers.conversationId, status: conversationMembers.status, lastReadAt: conversationMembers.lastReadAt })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(eq(conversationMembers.userId, me))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(100);
    const convIds = myMems.map((m) => m.conversationId);
    if (convIds.length === 0) return NextResponse.json({ primary: [], requests: [], requestCount: 0, unreadTotal: 0 });

    // The other participant in each 1:1 conversation.
    const others = await db
      .select({ conversationId: conversationMembers.conversationId, id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(conversationMembers)
      .innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(and(inArray(conversationMembers.conversationId, convIds), ne(conversationMembers.userId, me)));
    const otherByConv = new Map(others.map((o) => [o.conversationId, o]));

    // Latest message per conversation (preview + sort key).
    const lastRows = await db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        imageUrl: messages.imageUrl,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(messages.conversationId, desc(messages.createdAt));
    const lastByConv = new Map(lastRows.map((r) => [r.conversationId, r]));

    // Unread = messages from the other person newer than my lastReadAt.
    const unreadRows = await db
      .select({ conversationId: messages.conversationId, n: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversationMembers, and(eq(conversationMembers.conversationId, messages.conversationId), eq(conversationMembers.userId, me)))
      .where(and(
        inArray(messages.conversationId, convIds),
        ne(messages.senderId, me),
        or(isNull(conversationMembers.lastReadAt), gt(messages.createdAt, conversationMembers.lastReadAt)),
      ))
      .groupBy(messages.conversationId);
    const unreadByConv = new Map(unreadRows.map((r) => [r.conversationId, r.n]));

    const items = myMems
      .map((m) => {
        const last = lastByConv.get(m.conversationId);
        const other = otherByConv.get(m.conversationId);
        if (!last || !other) return null; // skip empty drafts / orphaned rows
        const unreadCount = unreadByConv.get(m.conversationId) ?? 0;
        return {
          conversationId: m.conversationId,
          status: m.status,
          other: { id: other.id, name: other.name, username: other.username, avatarUrl: other.avatarUrl },
          preview: last.body || (last.imageUrl ? 'GIF' : ''),
          fromMe: last.senderId === me,
          lastMessageAt: last.createdAt,
          unreadCount,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    const primary = items.filter((i) => i.status === 'accepted');
    const requests = items.filter((i) => i.status === 'pending');
    const unreadTotal = primary.reduce((sum, i) => sum + i.unreadCount, 0);
    return NextResponse.json({ primary, requests, requestCount: requests.length, unreadTotal });
  } catch (error) {
    console.error('Conversations GET error:', error);
    return NextResponse.json({ primary: [], requests: [], requestCount: 0, unreadTotal: 0 });
  }
}

// POST /api/messages/conversations — start (or fetch) a 1:1 conversation with a
// target user. Returns the conversation id; `isRequest` is true when it lands in
// the other person's Requests (we're not mutual followers).
export async function POST(request: NextRequest) {
  try {
    const { privyId, targetUserId } = await request.json() as { privyId?: string; targetUserId?: string };
    const me = await userIdFromPrivy(privyId);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!targetUserId || targetUserId === me) return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const key = dmKey(me, target.id);
    const [existing] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.dmKey, key)).limit(1);
    if (existing) return NextResponse.json({ conversationId: existing.id });

    const mutual = await areMutual(me, target.id);
    const [conv] = await db.insert(conversations).values({ dmKey: key }).returning({ id: conversations.id });
    await db.insert(conversationMembers).values([
      { conversationId: conv.id, userId: me, status: 'accepted' },
      { conversationId: conv.id, userId: target.id, status: mutual ? 'accepted' : 'pending' },
    ]);
    return NextResponse.json({ conversationId: conv.id, isRequest: !mutual });
  } catch (error) {
    console.error('Conversations POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
