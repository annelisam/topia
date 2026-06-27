import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, conversationMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { userIdFromPrivy, membership } from '@/lib/messages';

// POST /api/messages/<id>/request { action: 'accept' | 'decline' }
//   accept  → move the thread from my Requests into Primary
//   decline → delete the conversation (cascades members + messages)
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  try {
    const { privyId, action } = await request.json() as { privyId?: string; action?: 'accept' | 'decline' };
    const me = await userIdFromPrivy(privyId);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mem = await membership(conversationId, me);
    if (!mem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (action === 'accept') {
      await db.update(conversationMembers)
        .set({ status: 'accepted', lastReadAt: new Date() })
        .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, me)));
      return NextResponse.json({ ok: true, status: 'accepted' });
    }
    if (action === 'decline') {
      await db.delete(conversations).where(eq(conversations.id, conversationId));
      return NextResponse.json({ ok: true, status: 'declined' });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Request POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
