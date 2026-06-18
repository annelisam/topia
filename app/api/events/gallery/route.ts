import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, events, eventHosts, eventRsvps, eventGalleryPhotos, reactions } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getReactionsForTargets } from '@/lib/reactions';

/** User IDs who host this event — eventHosts join plus events.createdBy,
 * except for external imports where the submitter is not a host. Mirrors the
 * helper in the comments route. */
async function getHostIds(eventId: string, createdBy: string | null, externalSource: string | null): Promise<Set<string>> {
  const hosts = await db.select({ userId: eventHosts.userId }).from(eventHosts).where(eq(eventHosts.eventId, eventId));
  const ids = new Set(hosts.map((h) => h.userId));
  if (createdBy && !externalSource) ids.add(createdBy);
  return ids;
}

/** True if the user may add photos: a host, or a guest who has RSVP'd. */
async function canContribute(eventId: string, userId: string, hostIds: Set<string>): Promise<boolean> {
  if (hostIds.has(userId)) return true;
  const [rsvp] = await db.select({ id: eventRsvps.id }).from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId))).limit(1);
  return !!rsvp;
}

type IncomingPhoto = { url?: string; isVideo?: boolean; caption?: string };

/**
 * Event photo album. Read is public; hosts AND RSVP'd guests can add photos.
 * Each photo is attributed to its uploader. Guests can remove their own
 * photos; hosts can remove anyone's.
 *
 * GET    /api/events/gallery?slug=…[&viewerPrivyId=…]
 *          → { photos: [...with uploader...], canContribute, viewerId, viewerIsHost }
 * POST   /api/events/gallery  { privyId, slug, photos: [{ url, isVideo?, caption? }] }
 * PATCH  /api/events/gallery  { privyId, id, caption }     (owner or host)
 * DELETE /api/events/gallery?id=…&privyId=…                (owner or host)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    const [event] = await db
      .select({ id: events.id, createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const uploaders = alias(users, 'uploaders');
    const photos = await db
      .select({
        id: eventGalleryPhotos.id,
        url: eventGalleryPhotos.url,
        isVideo: eventGalleryPhotos.isVideo,
        caption: eventGalleryPhotos.caption,
        createdAt: eventGalleryPhotos.createdAt,
        uploaderId: eventGalleryPhotos.uploadedBy,
        uploaderName: uploaders.name,
        uploaderUsername: uploaders.username,
        uploaderAvatarUrl: uploaders.avatarUrl,
      })
      .from(eventGalleryPhotos)
      .leftJoin(uploaders, eq(eventGalleryPhotos.uploadedBy, uploaders.id))
      .where(eq(eventGalleryPhotos.eventId, event.id))
      .orderBy(asc(eventGalleryPhotos.sortOrder), asc(eventGalleryPhotos.createdAt));

    const hostIds = await getHostIds(event.id, event.createdBy, event.externalSource);

    let viewerId: string | null = null;
    let viewerIsHost = false;
    let viewerCanContribute = false;
    if (viewerPrivyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (viewer) {
        viewerId = viewer.id;
        viewerIsHost = hostIds.has(viewer.id);
        viewerCanContribute = await canContribute(event.id, viewer.id, hostIds);
      }
    }
    // Emoji reactions per photo — one batched query (mirrors comments).
    const reactionsByPhoto = await getReactionsForTargets('event_photo', photos.map((p) => p.id), viewerId);

    // Flag host-uploaded photos so the client can badge them + attach reactions.
    const withHost = photos.map((p) => ({
      ...p,
      uploaderIsHost: !!(p.uploaderId && hostIds.has(p.uploaderId)),
      reactions: reactionsByPhoto[p.id] ?? [],
    }));

    return NextResponse.json({ photos: withHost, canContribute: viewerCanContribute, viewerId, viewerIsHost });
  } catch (error) {
    console.error('GET event gallery error:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { privyId, slug, photos } = await request.json() as { privyId?: string; slug?: string; photos?: IncomingPhoto[] };
    if (!privyId || !slug) return NextResponse.json({ error: 'Missing privyId or slug' }, { status: 400 });

    const clean = (photos ?? [])
      .filter((p): p is IncomingPhoto & { url: string } => typeof p?.url === 'string' && p.url.length > 0)
      .slice(0, 50); // cap per request
    if (clean.length === 0) return NextResponse.json({ error: 'No photos provided' }, { status: 400 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [event] = await db
      .select({ id: events.id, createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const hostIds = await getHostIds(event.id, event.createdBy, event.externalSource);
    if (!(await canContribute(event.id, user.id, hostIds))) {
      return NextResponse.json({ error: 'RSVP to add photos.' }, { status: 403 });
    }

    // Append after any existing photos so order is stable.
    const existing = await db.select({ sortOrder: eventGalleryPhotos.sortOrder })
      .from(eventGalleryPhotos).where(eq(eventGalleryPhotos.eventId, event.id));
    const base = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0);

    const rows = clean.map((p, i) => ({
      eventId: event.id,
      url: p.url,
      isVideo: !!p.isVideo,
      caption: p.caption?.trim() || null,
      uploadedBy: user.id,
      sortOrder: base + i + 1,
    }));
    await db.insert(eventGalleryPhotos).values(rows);

    // Re-read the inserted rows joined with the uploader so the client gets
    // attribution without a second request.
    const [me] = await db.select({ name: users.name, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, user.id)).limit(1);
    const inserted = await db
      .select({
        id: eventGalleryPhotos.id, url: eventGalleryPhotos.url, isVideo: eventGalleryPhotos.isVideo,
        caption: eventGalleryPhotos.caption, createdAt: eventGalleryPhotos.createdAt,
      })
      .from(eventGalleryPhotos)
      .where(and(eq(eventGalleryPhotos.eventId, event.id), eq(eventGalleryPhotos.uploadedBy, user.id)))
      .orderBy(asc(eventGalleryPhotos.sortOrder));
    const justAdded = inserted.slice(-rows.length).map((p) => ({
      ...p,
      uploaderId: user.id,
      uploaderName: me?.name ?? null,
      uploaderUsername: me?.username ?? null,
      uploaderAvatarUrl: me?.avatarUrl ?? null,
      uploaderIsHost: hostIds.has(user.id),
      reactions: [],
    }));

    return NextResponse.json({ photos: justAdded }, { status: 201 });
  } catch (error) {
    console.error('POST event gallery error:', error);
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { privyId, id, caption } = await request.json() as { privyId?: string; id?: string; caption?: string };
    if (!privyId || !id) return NextResponse.json({ error: 'Missing privyId or id' }, { status: 400 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [photo] = await db.select({ eventId: eventGalleryPhotos.eventId, uploadedBy: eventGalleryPhotos.uploadedBy })
      .from(eventGalleryPhotos).where(eq(eventGalleryPhotos.id, id)).limit(1);
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    // The uploader can edit their own caption; hosts can edit any.
    if (photo.uploadedBy !== user.id) {
      const [event] = await db.select({ id: events.id, createdBy: events.createdBy, externalSource: events.externalSource })
        .from(events).where(eq(events.id, photo.eventId)).limit(1);
      const hostIds = event ? await getHostIds(event.id, event.createdBy, event.externalSource) : new Set<string>();
      if (!hostIds.has(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const next = typeof caption === 'string' ? caption.trim().slice(0, 280) : '';
    await db.update(eventGalleryPhotos).set({ caption: next || null }).where(eq(eventGalleryPhotos.id, id));
    return NextResponse.json({ ok: true, caption: next || null });
  } catch (error) {
    console.error('PATCH event gallery error:', error);
    return NextResponse.json({ error: 'Failed to update caption' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!id || !privyId) return NextResponse.json({ error: 'Missing id or privyId' }, { status: 400 });
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [photo] = await db.select({ eventId: eventGalleryPhotos.eventId, uploadedBy: eventGalleryPhotos.uploadedBy })
      .from(eventGalleryPhotos).where(eq(eventGalleryPhotos.id, id)).limit(1);
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    // Uploaders can remove their own photos; hosts can remove anyone's.
    if (photo.uploadedBy !== user.id) {
      const [event] = await db
        .select({ id: events.id, createdBy: events.createdBy, externalSource: events.externalSource })
        .from(events).where(eq(events.id, photo.eventId)).limit(1);
      const hostIds = event ? await getHostIds(event.id, event.createdBy, event.externalSource) : new Set<string>();
      if (!hostIds.has(user.id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.delete(eventGalleryPhotos).where(eq(eventGalleryPhotos.id, id));
    // Sweep this photo's reactions (target_id isn't a FK, so clean up by hand).
    await db.delete(reactions).where(and(eq(reactions.targetType, 'event_photo'), eq(reactions.targetId, id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE event gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
