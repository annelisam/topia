import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

// GET – fetch notifications for current user
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!privyId) {
    return NextResponse.json({ notifications: [] });
  }

  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ notifications: [] });

    const results = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        read: notifications.read,
        createdAt: notifications.createdAt,
        actorId: notifications.actorId,
        actorName: users.name,
        actorUsername: users.username,
        actorAvatar: users.avatarUrl,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .where(eq(notifications.recipientId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = results.filter((n) => !n.read).length;

    return NextResponse.json({ notifications: results, unreadCount });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PUT – mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const { privyId, notificationIds } = await request.json();
    if (!privyId) return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await db.update(notifications)
        .set({ read: true })
        .where(inArray(notifications.id, notificationIds));
    } else {
      // Mark all as read
      await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.recipientId, user.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
