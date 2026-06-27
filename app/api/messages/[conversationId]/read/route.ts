import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversationMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { userIdFromPrivy } from '@/lib/messages';

// POST /api/messages/<id>/read — mark the thread read up to now (clears unread).
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  try {
    const { privyId } = await request.json() as { privyId?: string };
    const me = await userIdFromPrivy(privyId);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db.update(conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, me)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Read POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
