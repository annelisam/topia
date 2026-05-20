import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, events, eventRsvps, eventHosts, eventComments } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getReactionsForTargets } from '@/lib/reactions';

/** Returns the set of user IDs who are hosts of this event. Includes the
 * eventHosts join AND the events.createdBy field — but skips createdBy for
 * external events (the submitter is *not* a host for shared imports). */
async function getHostIds(eventId: string, createdBy: string | null, externalSource: string | null): Promise<Set<string>> {
  const hosts = await db.select({ userId: eventHosts.userId }).from(eventHosts).where(eq(eventHosts.eventId, eventId));
  const ids = new Set(hosts.map((h) => h.userId));
  if (createdBy && !externalSource) ids.add(createdBy);
  return ids;
}

/**
 * Event comments + optional Giphy gif. Write is gated to users who have
 * either RSVP'd (row in event_rsvps) or marked the event "interested"
 * (slug exists in users.saved_event_slugs CSV). Read is public.
 *
 * GET /api/events/comments?slug=…
 *   → { comments: [...], canPost: boolean (when viewerPrivyId provided) }
 *
 * POST /api/events/comments  { privyId, slug, body?, imageUrl?, giphyId? }
 * DELETE /api/events/comments?id=…&privyId=…  (author only)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    const [event] = await db
      .select({ id: events.id, slug: events.slug, createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const authors = alias(users, 'authors');
    // Pull ALL rows (top-level + replies) in one shot — cheaper than two
    // queries, then we split by parentId in memory.
    const rows = await db
      .select({
        id: eventComments.id,
        body: eventComments.body,
        imageUrl: eventComments.imageUrl,
        giphyId: eventComments.giphyId,
        parentId: eventComments.parentId,
        createdAt: eventComments.createdAt,
        authorId: eventComments.userId,
        authorName: authors.name,
        authorUsername: authors.username,
        authorAvatarUrl: authors.avatarUrl,
      })
      .from(eventComments)
      .leftJoin(authors, eq(eventComments.userId, authors.id))
      .where(eq(eventComments.eventId, event.id))
      .orderBy(asc(eventComments.createdAt));

    // Resolve hosts so we can render the HOST pill on host comments.
    const hostIds = await getHostIds(event.id, event.createdBy, event.externalSource);

    // Resolve viewer id (used for reactions' viewerReacted flag + canPost)
    let viewerId: string | null = null;
    let viewerSavedSlugs = '';
    if (viewerPrivyId) {
      const [viewer] = await db
        .select({ id: users.id, savedEventSlugs: users.savedEventSlugs })
        .from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (viewer) {
        viewerId = viewer.id;
        viewerSavedSlugs = viewer.savedEventSlugs ?? '';
      }
    }

    // Reactions per comment — single query batched across all IDs
    const reactionsByTarget = await getReactionsForTargets('event_comment', rows.map((r) => r.id), viewerId);

    // Annotate each row + split into top-level + replies (one level deep)
    type Annotated = typeof rows[number] & {
      isHost: boolean;
      reactions: ReturnType<typeof getReactionsForTargets> extends Promise<Record<string, infer V>> ? V : never;
      replies: Annotated[];
    };
    const annotated: Annotated[] = rows.map((r) => ({
      ...r,
      isHost: hostIds.has(r.authorId),
      reactions: reactionsByTarget[r.id] ?? [],
      replies: [],
    }));
    const byId = new Map(annotated.map((c) => [c.id, c]));
    const topLevel: Annotated[] = [];
    for (const c of annotated) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(c);
      } else {
        topLevel.push(c);
      }
    }
    // Sort top-level newest-first; replies stay oldest-first within each thread
    topLevel.sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0));
    const comments = topLevel;

    // Gate check — hosts always allowed; otherwise must be RSVP'd OR
    // interested (event slug in savedEventSlugs CSV).
    let canPost = false;
    if (viewerId) {
      if (hostIds.has(viewerId)) {
        canPost = true;
      } else {
        const saved = viewerSavedSlugs.split(',').map((s) => s.trim()).filter(Boolean);
        if (saved.includes(event.slug)) {
          canPost = true;
        } else {
          const [rsvp] = await db.select({ id: eventRsvps.id }).from(eventRsvps)
            .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.userId, viewerId))).limit(1);
          canPost = !!rsvp;
        }
      }
    }

    return NextResponse.json({ comments, canPost });
  } catch (error) {
    console.error('GET event comments error:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { privyId, slug, body, imageUrl, giphyId, parentId } = await request.json();
    if (!privyId || !slug) return NextResponse.json({ error: 'Missing privyId or slug' }, { status: 400 });
    if (!body?.trim() && !imageUrl) return NextResponse.json({ error: 'Body or gif required' }, { status: 400 });

    const [user]  = await db.select({ id: users.id, savedEventSlugs: users.savedEventSlugs }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [event] = await db
      .select({ id: events.id, slug: events.slug, createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // Gate: host OR RSVP'd OR interested. Hosts skip the engagement check
    // because they're running the event — no point demanding they RSVP to
    // their own party.
    const hostIds = await getHostIds(event.id, event.createdBy, event.externalSource);
    let allowed = hostIds.has(user.id);
    if (!allowed) {
      const saved = (user.savedEventSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (saved.includes(event.slug)) {
        allowed = true;
      } else {
        const [rsvp] = await db.select({ id: eventRsvps.id }).from(eventRsvps).where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.userId, user.id))).limit(1);
        allowed = !!rsvp;
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "RSVP or mark interested to comment." }, { status: 403 });
    }

    // If this is a reply, validate the parent belongs to the same event
    // AND is itself a top-level comment (one-level nesting only).
    let resolvedParentId: string | null = null;
    if (parentId) {
      const [parent] = await db
        .select({ id: eventComments.id, eventId: eventComments.eventId, parentId: eventComments.parentId })
        .from(eventComments).where(eq(eventComments.id, parentId)).limit(1);
      if (!parent || parent.eventId !== event.id) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
      // Don't allow replies to replies — keep threads one level deep
      resolvedParentId = parent.parentId ?? parent.id;
    }

    const [inserted] = await db.insert(eventComments).values({
      eventId: event.id,
      userId:  user.id,
      body:    body?.trim() || null,
      imageUrl: imageUrl || null,
      giphyId:  giphyId  || null,
      parentId: resolvedParentId,
    }).returning();

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error('POST event comments error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id      = request.nextUrl.searchParams.get('id');
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!id || !privyId) return NextResponse.json({ error: 'Missing id or privyId' }, { status: 400 });
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [comment] = await db.select({ userId: eventComments.userId }).from(eventComments).where(eq(eventComments.id, id)).limit(1);
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (comment.userId !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    await db.delete(eventComments).where(eq(eventComments.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE event comments error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
