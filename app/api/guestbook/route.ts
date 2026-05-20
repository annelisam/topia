import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows, guestbookEntries } from '@/lib/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * GET /api/guestbook?username=…[&viewerPrivyId=…]
 *
 * Returns the public guestbook for the profile + the viewer's relationship
 * to the profile owner, so the client can decide which composer to show:
 *
 *   relation = 'mutual'   → drawing + text + gif
 *   relation = 'oneway'   → text + gif         (viewer follows profile, or vice-versa)
 *   relation = 'none'     → read-only
 *   relation = 'self'     → read-only (you can't sign your own guestbook)
 *   relation = 'anon'     → not signed in
 */
export async function GET(request: NextRequest) {
  const username       = request.nextUrl.searchParams.get('username');
  const viewerPrivyId  = request.nextUrl.searchParams.get('viewerPrivyId');
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

  try {
    const [profile] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Pull entries + author info
    const authors = alias(users, 'authors');
    const entries = await db
      .select({
        id: guestbookEntries.id,
        kind: guestbookEntries.kind,
        body: guestbookEntries.body,
        imageUrl: guestbookEntries.imageUrl,
        giphyId: guestbookEntries.giphyId,
        createdAt: guestbookEntries.createdAt,
        authorId: guestbookEntries.authorUserId,
        authorName: authors.name,
        authorUsername: authors.username,
        authorAvatarUrl: authors.avatarUrl,
      })
      .from(guestbookEntries)
      .leftJoin(authors, eq(guestbookEntries.authorUserId, authors.id))
      .where(eq(guestbookEntries.profileUserId, profile.id))
      .orderBy(desc(guestbookEntries.createdAt));

    // Determine viewer relation
    let relation: 'anon' | 'self' | 'none' | 'oneway' | 'mutual' = 'anon';
    if (viewerPrivyId) {
      const [viewer] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.privyId, viewerPrivyId))
        .limit(1);
      if (!viewer) {
        relation = 'anon';
      } else if (viewer.id === profile.id) {
        relation = 'self';
      } else {
        // Two cheap row-existence checks. Two ORs would be slicker but harder to read.
        const [aFollowsB, bFollowsA] = await Promise.all([
          db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, viewer.id),  eq(follows.followingId, profile.id))).limit(1),
          db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, profile.id), eq(follows.followingId, viewer.id))).limit(1),
        ]);
        const a = aFollowsB.length > 0;
        const b = bFollowsA.length > 0;
        relation = a && b ? 'mutual' : (a || b ? 'oneway' : 'none');
      }
    }

    return NextResponse.json({ entries, relation });
  } catch (error) {
    console.error('GET guestbook error:', error);
    return NextResponse.json({ error: 'Failed to load guestbook' }, { status: 500 });
  }
}

/**
 * POST /api/guestbook
 * Body: { privyId, profileUsername, kind, body?, imageUrl?, giphyId? }
 *
 * Gates writes by follow relationship:
 *   - kind='drawing' → requires mutual follow
 *   - kind='message' | 'gif' → requires at least one-way follow
 *   - self-signing not allowed
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { privyId, profileUsername, kind, body, imageUrl, giphyId } = data;

    if (!privyId || !profileUsername) {
      return NextResponse.json({ error: 'Missing privyId or profileUsername' }, { status: 400 });
    }
    if (!['drawing', 'message', 'gif'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    if (kind === 'drawing' && !imageUrl) {
      return NextResponse.json({ error: 'Drawing requires imageUrl' }, { status: 400 });
    }
    if (kind === 'gif' && !imageUrl) {
      return NextResponse.json({ error: 'Gif requires imageUrl' }, { status: 400 });
    }
    if (kind === 'message' && (!body || !body.trim())) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 });
    }

    // Resolve both users
    const [author] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!author) return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    const [profile] = await db.select({ id: users.id }).from(users).where(eq(users.username, profileUsername)).limit(1);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (author.id === profile.id) {
      return NextResponse.json({ error: "Can't sign your own guestbook" }, { status: 403 });
    }

    // Check follow relation
    const [aFollowsB, bFollowsA] = await Promise.all([
      db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, author.id),  eq(follows.followingId, profile.id))).limit(1),
      db.select({ id: follows.id }).from(follows).where(and(eq(follows.followerId, profile.id), eq(follows.followingId, author.id))).limit(1),
    ]);
    const isMutual = aFollowsB.length > 0 && bFollowsA.length > 0;
    const isOneway = aFollowsB.length > 0 || bFollowsA.length > 0;

    if (kind === 'drawing' && !isMutual) {
      return NextResponse.json({ error: 'Drawings require a mutual follow' }, { status: 403 });
    }
    if ((kind === 'message' || kind === 'gif') && !isOneway) {
      return NextResponse.json({ error: 'Follow each other first to leave a note' }, { status: 403 });
    }

    const [inserted] = await db.insert(guestbookEntries).values({
      profileUserId: profile.id,
      authorUserId:  author.id,
      kind,
      body: body?.trim() || null,
      imageUrl: imageUrl || null,
      giphyId:  giphyId  || null,
    }).returning();

    return NextResponse.json({ entry: inserted }, { status: 201 });
  } catch (error) {
    console.error('POST guestbook error:', error);
    return NextResponse.json({ error: 'Failed to sign guestbook' }, { status: 500 });
  }
}

/**
 * DELETE /api/guestbook?id=…&privyId=…
 * Owner of the profile OR author of the entry can delete.
 */
export async function DELETE(request: NextRequest) {
  const id      = request.nextUrl.searchParams.get('id');
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!id || !privyId) return NextResponse.json({ error: 'Missing id or privyId' }, { status: 400 });

  try {
    const [user]  = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [entry] = await db.select({ profileUserId: guestbookEntries.profileUserId, authorUserId: guestbookEntries.authorUserId }).from(guestbookEntries).where(eq(guestbookEntries.id, id)).limit(1);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    if (entry.profileUserId !== user.id && entry.authorUserId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    await db.delete(guestbookEntries).where(eq(guestbookEntries.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE guestbook error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

// Re-export for `import * as orderHelpers from`. Drizzle's helpers needed
// elsewhere — keep them isolated to avoid circular import surprises.
export const __asc = asc;
