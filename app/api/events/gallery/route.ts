import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, events, eventHosts, eventGalleryPhotos } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

/** User IDs who host this event — eventHosts join plus events.createdBy,
 * except for external imports where the submitter is not a host. Mirrors the
 * helper in the comments route. */
async function getHostIds(eventId: string, createdBy: string | null, externalSource: string | null): Promise<Set<string>> {
  const hosts = await db.select({ userId: eventHosts.userId }).from(eventHosts).where(eq(eventHosts.eventId, eventId));
  const ids = new Set(hosts.map((h) => h.userId));
  if (createdBy && !externalSource) ids.add(createdBy);
  return ids;
}

type IncomingPhoto = { url?: string; isVideo?: boolean; caption?: string };

/**
 * Event photo album. Read is public; only hosts add or remove photos.
 *
 * GET    /api/events/gallery?slug=…[&viewerPrivyId=…]
 *          → { photos: [...], viewerIsHost }
 * POST   /api/events/gallery  { privyId, slug, photos: [{ url, isVideo?, caption? }] }
 * DELETE /api/events/gallery?id=…&privyId=…   (host only)
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

    const photos = await db
      .select({
        id: eventGalleryPhotos.id,
        url: eventGalleryPhotos.url,
        isVideo: eventGalleryPhotos.isVideo,
        caption: eventGalleryPhotos.caption,
        createdAt: eventGalleryPhotos.createdAt,
      })
      .from(eventGalleryPhotos)
      .where(eq(eventGalleryPhotos.eventId, event.id))
      .orderBy(asc(eventGalleryPhotos.sortOrder), asc(eventGalleryPhotos.createdAt));

    let viewerIsHost = false;
    if (viewerPrivyId) {
      const [viewer] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      if (viewer) {
        const hostIds = await getHostIds(event.id, event.createdBy, event.externalSource);
        viewerIsHost = hostIds.has(viewer.id);
      }
    }

    return NextResponse.json({ photos, viewerIsHost });
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
    if (!hostIds.has(user.id)) return NextResponse.json({ error: 'Only hosts can add photos' }, { status: 403 });

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
    const inserted = await db.insert(eventGalleryPhotos).values(rows).returning({
      id: eventGalleryPhotos.id,
      url: eventGalleryPhotos.url,
      isVideo: eventGalleryPhotos.isVideo,
      caption: eventGalleryPhotos.caption,
      createdAt: eventGalleryPhotos.createdAt,
    });

    return NextResponse.json({ photos: inserted }, { status: 201 });
  } catch (error) {
    console.error('POST event gallery error:', error);
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const privyId = request.nextUrl.searchParams.get('privyId');
  if (!id || !privyId) return NextResponse.json({ error: 'Missing id or privyId' }, { status: 400 });
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [photo] = await db.select({ eventId: eventGalleryPhotos.eventId }).from(eventGalleryPhotos).where(eq(eventGalleryPhotos.id, id)).limit(1);
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    const [event] = await db
      .select({ id: events.id, createdBy: events.createdBy, externalSource: events.externalSource })
      .from(events).where(eq(events.id, photo.eventId)).limit(1);
    const hostIds = event ? await getHostIds(event.id, event.createdBy, event.externalSource) : new Set<string>();
    if (!hostIds.has(user.id)) return NextResponse.json({ error: 'Only hosts can remove photos' }, { status: 403 });

    await db.delete(eventGalleryPhotos).where(eq(eventGalleryPhotos.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE event gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
