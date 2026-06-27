import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, conversationMembers, messages, users } from '@/lib/db/schema';
import { and, eq, ne, gt, asc, desc } from 'drizzle-orm';
import { userIdFromPrivy, membership } from '@/lib/messages';

// GET /api/messages/<id>?privyId=…&after=<iso> — the thread. `after` returns
// only messages newer than that timestamp (used by the polling loop); otherwise
// the most recent 100, oldest-first.
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const privyId = request.nextUrl.searchParams.get('privyId');
  const after = request.nextUrl.searchParams.get('after');
  const me = await userIdFromPrivy(privyId);
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mem = await membership(conversationId, me);
  if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const [other] = await db
      .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(conversationMembers)
      .innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.userId, me)))
      .limit(1);

    const cols = {
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      imageUrl: messages.imageUrl,
      giphyId: messages.giphyId,
      createdAt: messages.createdAt,
    };

    let rows;
    if (after) {
      // `>` may re-include the boundary message (the cursor is ms-precision but
      // Postgres stores microseconds); the client dedupes by id, so that's fine.
      const afterDate = new Date(after);
      rows = await db.select(cols).from(messages)
        .where(and(eq(messages.conversationId, conversationId), gt(messages.createdAt, afterDate)))
        .orderBy(asc(messages.createdAt));
    } else {
      const recent = await db.select(cols).from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(100);
      rows = recent.reverse();
    }

    return NextResponse.json({ messages: rows, other: other ?? null, status: mem.status, meId: me });
  } catch (error) {
    console.error('Thread GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST /api/messages/<id> — send a message. Replying to a request (my membership
// is 'pending') accepts it, moving the thread into my Primary.
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  try {
    const { privyId, body, imageUrl, giphyId } = await request.json() as {
      privyId?: string; body?: string; imageUrl?: string; giphyId?: string;
    };
    const me = await userIdFromPrivy(privyId);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mem = await membership(conversationId, me);
    if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const text = (body ?? '').trim().slice(0, 4000);
    const img = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    if (!text && !img) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    const [msg] = await db.insert(messages).values({
      conversationId,
      senderId: me,
      body: text || null,
      imageUrl: img,
      giphyId: giphyId ?? null,
    }).returning({
      id: messages.id, senderId: messages.senderId, body: messages.body,
      imageUrl: messages.imageUrl, giphyId: messages.giphyId, createdAt: messages.createdAt,
    });

    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
    // Sending a reply accepts a request + marks my side read up to now.
    await db.update(conversationMembers)
      .set({ status: 'accepted', lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, me)));

    return NextResponse.json({ message: msg });
  } catch (error) {
    console.error('Thread POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
