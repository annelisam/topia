import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldAnnouncements, worldMembers, worldFollows, worlds, users, notifications } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// GET – fetch recent announcements for a world
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');
    if (!worldId) {
      return NextResponse.json({ error: 'Missing worldId' }, { status: 400 });
    }

    const announcements = await db
      .select({
        id: worldAnnouncements.id,
        body: worldAnnouncements.body,
        createdAt: worldAnnouncements.createdAt,
        authorId: worldAnnouncements.authorId,
        authorName: users.name,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(worldAnnouncements)
      .innerJoin(users, eq(worldAnnouncements.authorId, users.id))
      .where(eq(worldAnnouncements.worldId, worldId))
      .orderBy(desc(worldAnnouncements.createdAt))
      .limit(20);

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error fetching world announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// Owner or world_builder only — collaborators can't post updates.
async function verifyCanPost(privyId: string, worldId: string) {
  const [caller] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  if (!caller) return null;

  const [membership] = await db
    .select({ id: worldMembers.id })
    .from(worldMembers)
    .where(and(eq(worldMembers.worldId, worldId), eq(worldMembers.userId, caller.id), inArray(worldMembers.role, ['owner', 'world_builder'])))
    .limit(1);

  return membership ? caller.id : null;
}

// POST – post a new announcement
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { worldId, privyId, body } = data;

    if (!worldId || !privyId || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authorId = await verifyCanPost(privyId, worldId);
    if (!authorId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const [inserted] = await db.insert(worldAnnouncements).values({
      worldId,
      authorId,
      body: body.trim(),
    }).returning();

    const [author] = await db
      .select({ name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);

    // Notify the world's followers (fans, not members) about the update.
    try {
      const followerRows = await db
        .select({ userId: worldFollows.userId })
        .from(worldFollows)
        .where(eq(worldFollows.worldId, worldId));
      if (followerRows.length > 0) {
        const [worldRow] = await db
          .select({ title: worlds.title, slug: worlds.slug })
          .from(worlds)
          .where(eq(worlds.id, worldId))
          .limit(1);
        for (const f of followerRows) {
          if (f.userId === authorId) continue;
          await db.insert(notifications).values({
            recipientId: f.userId,
            actorId: authorId,
            type: 'world_announcement',
            metadata: { worldId, worldTitle: worldRow?.title, worldSlug: worldRow?.slug },
          });
        }
      }
    } catch (e) {
      console.error('[world-announcement] follower notifications failed:', e);
    }

    return NextResponse.json({
      announcement: {
        ...inserted,
        authorName: author?.name ?? null,
        authorUsername: author?.username ?? null,
        authorAvatarUrl: author?.avatarUrl ?? null,
      },
    });
  } catch (error) {
    console.error('Error posting world announcement:', error);
    return NextResponse.json({ error: 'Failed to post announcement' }, { status: 500 });
  }
}
