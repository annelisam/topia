import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worlds, worldMembers, worldFollows, worldPosts, notifications } from '@/lib/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getReactionsForTargets } from '@/lib/reactions';

export const WORLD_POST_CATEGORIES = ['general', 'drops', 'questions', 'show'] as const;

/** World member roles, split into "can moderate" (builders) and "can post"
 * (any member). Mirrors the permission matrix in /api/worlds/members. */
async function getMemberRoles(worldId: string) {
  const rows = await db
    .select({ userId: worldMembers.userId, role: worldMembers.role })
    .from(worldMembers)
    .where(eq(worldMembers.worldId, worldId));
  const builders = new Set(rows.filter((r) => r.role === 'owner' || r.role === 'world_builder').map((r) => r.userId));
  const members = new Set(rows.map((r) => r.userId));
  return { builders, members };
}

/**
 * World forum posts — chatroom flow with categories, one-level replies,
 * reactions (via /api/reactions, targetType 'world_post') and builder pins.
 * Read is public; posting is gated to world members (any role).
 *
 * GET    /api/worlds/posts?slug=…&viewerPrivyId=…
 *          → { comments, canPost, viewerId, viewerIsHost }  (CommentSection contract)
 * POST   /api/worlds/posts   { privyId, slug, body?, imageUrl?, giphyId?, parentId?, category? }
 * PATCH  /api/worlds/posts   { privyId, id, pinned }        (builders only)
 * DELETE /api/worlds/posts?id=…&privyId=…                   (author or builder)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    const [world] = await db.select({ id: worlds.id }).from(worlds).where(eq(worlds.slug, slug)).limit(1);
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const authors = alias(users, 'authors');
    const rows = await db
      .select({
        id: worldPosts.id,
        body: worldPosts.body,
        imageUrl: worldPosts.imageUrl,
        giphyId: worldPosts.giphyId,
        category: worldPosts.category,
        pinned: worldPosts.pinned,
        parentId: worldPosts.parentId,
        createdAt: worldPosts.createdAt,
        authorId: worldPosts.userId,
        authorName: authors.name,
        authorUsername: authors.username,
        authorAvatarUrl: authors.avatarUrl,
      })
      .from(worldPosts)
      .leftJoin(authors, eq(worldPosts.userId, authors.id))
      .where(eq(worldPosts.worldId, world.id))
      .orderBy(asc(worldPosts.createdAt));

    const { builders, members } = await getMemberRoles(world.id);

    let viewerId: string | null = null;
    if (viewerPrivyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (viewer) viewerId = viewer.id;
    }

    const reactionsByTarget = await getReactionsForTargets('world_post', rows.map((r) => r.id), viewerId);

    type Annotated = typeof rows[number] & {
      isHost: boolean;
      reactions: (typeof reactionsByTarget)[string];
      replies: Annotated[];
    };
    const annotated: Annotated[] = rows.map((r) => ({
      ...r,
      isHost: builders.has(r.authorId),
      reactions: reactionsByTarget[r.id] ?? [],
      replies: [],
    }));
    const byId = new Map(annotated.map((c) => [c.id, c]));
    const topLevel: Annotated[] = [];
    for (const c of annotated) {
      if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.replies.push(c);
      else topLevel.push(c);
    }
    // Pinned posts first, then newest; replies stay oldest-first in-thread.
    topLevel.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt as unknown as string).getTime() - new Date(a.createdAt as unknown as string).getTime();
    });

    const canPost = !!(viewerId && members.has(viewerId));
    return NextResponse.json({
      comments: topLevel,
      canPost,
      viewerId,
      viewerIsHost: !!(viewerId && builders.has(viewerId)),
    });
  } catch (error) {
    console.error('[world-posts] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { privyId, slug, body, imageUrl, giphyId, parentId, category } = await request.json();
    if (!privyId || !slug) return NextResponse.json({ error: 'Missing privyId or slug' }, { status: 400 });
    if (!body?.trim() && !imageUrl) return NextResponse.json({ error: 'Body or gif required' }, { status: 400 });

    const [user] = await db.select({ id: users.id, name: users.name, username: users.username }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [world] = await db.select({ id: worlds.id, title: worlds.title, slug: worlds.slug }).from(worlds).where(eq(worlds.slug, slug)).limit(1);
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const { builders, members } = await getMemberRoles(world.id);
    if (!members.has(user.id)) {
      return NextResponse.json({ error: 'Only world members can post here.' }, { status: 403 });
    }

    // Validate enum-ish category at the route; replies never carry one.
    let cleanCategory: string | null = null;
    if (!parentId && category) {
      if (!WORLD_POST_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: `category must be one of: ${WORLD_POST_CATEGORIES.join(', ')}` }, { status: 400 });
      }
      cleanCategory = category;
    }

    // One-level nesting only — same rule as event comments.
    let resolvedParentId: string | null = null;
    let parentAuthorId: string | null = null;
    if (parentId) {
      const [parent] = await db
        .select({ id: worldPosts.id, worldId: worldPosts.worldId, parentId: worldPosts.parentId, userId: worldPosts.userId })
        .from(worldPosts).where(eq(worldPosts.id, parentId)).limit(1);
      if (!parent || parent.worldId !== world.id) {
        return NextResponse.json({ error: 'Invalid parent post' }, { status: 400 });
      }
      resolvedParentId = parent.parentId ?? parent.id;
      parentAuthorId = parent.userId;
    }

    const [inserted] = await db.insert(worldPosts).values({
      worldId: world.id,
      userId: user.id,
      body: body?.trim() || null,
      imageUrl: imageUrl || null,
      giphyId: giphyId || null,
      category: cleanCategory,
      parentId: resolvedParentId,
    }).returning();

    // Notifications — best-effort, never fail the post.
    try {
      const meta = { worldId: world.id, worldTitle: world.title, worldSlug: world.slug };
      if (parentAuthorId && parentAuthorId !== user.id) {
        // Reply → tell the parent author.
        await db.insert(notifications).values({ recipientId: parentAuthorId, actorId: user.id, type: 'world_post_reply', metadata: meta });
      } else if (!resolvedParentId && builders.has(user.id)) {
        // A builder's top-level post → tell the world's followers (the same
        // payoff following already has for announcements).
        const follows = await db.select({ userId: worldFollows.userId }).from(worldFollows).where(eq(worldFollows.worldId, world.id));
        const rows = follows.filter((f) => f.userId !== user.id)
          .map((f) => ({ recipientId: f.userId, actorId: user.id, type: 'world_post', metadata: meta }));
        if (rows.length) await db.insert(notifications).values(rows);
      }
    } catch (err) {
      console.error('[world-posts] notify failed:', err);
    }

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error('[world-posts] POST failed:', error);
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { privyId, id, pinned } = await request.json();
    if (!privyId || !id) return NextResponse.json({ error: 'Missing privyId or id' }, { status: 400 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [post] = await db.select({ id: worldPosts.id, worldId: worldPosts.worldId, parentId: worldPosts.parentId }).from(worldPosts).where(eq(worldPosts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (post.parentId) return NextResponse.json({ error: 'Only top-level posts can be pinned' }, { status: 400 });

    const { builders } = await getMemberRoles(post.worldId);
    if (!builders.has(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.update(worldPosts).set({ pinned: !!pinned }).where(eq(worldPosts.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[world-posts] PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!id || !privyId) return NextResponse.json({ error: 'Missing id or privyId' }, { status: 400 });
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [post] = await db.select({ userId: worldPosts.userId, worldId: worldPosts.worldId }).from(worldPosts).where(eq(worldPosts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    if (post.userId !== user.id) {
      const { builders } = await getMemberRoles(post.worldId);
      if (!builders.has(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    // Delete the thread (replies cascade via parent match — one level only).
    await db.delete(worldPosts).where(eq(worldPosts.parentId, id));
    await db.delete(worldPosts).where(eq(worldPosts.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[world-posts] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
