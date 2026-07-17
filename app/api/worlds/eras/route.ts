import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldEras, eraMilestones, eraProcessPosts, worldMembers, users } from '@/lib/db/schema';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import { cleanDate, cleanPrecision } from '@/lib/eraDates';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const ERA_STATUSES = new Set(['active', 'complete', 'archived']);

// Same builder bar as world projects: owners and world_builders write,
// collaborators and the public read.
const BUILDER_ROLES = ['owner', 'world_builder'];

async function verifyWorldBuilder(privyId: string, worldId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  if (!user) return null;
  const [membership] = await db.select({ id: worldMembers.id }).from(worldMembers)
    .where(and(
      eq(worldMembers.worldId, worldId),
      eq(worldMembers.userId, user.id),
      inArray(worldMembers.role, BUILDER_ROLES),
    )).limit(1);
  return membership ? user.id : null;
}

async function erasWithMilestones(worldId: string) {
  const eras = await db.select().from(worldEras)
    .where(eq(worldEras.worldId, worldId))
    .orderBy(asc(worldEras.sortOrder), asc(worldEras.createdAt));
  if (eras.length === 0) return [];
  const eraIds = eras.map((e) => e.id);
  const [milestones, posts] = await Promise.all([
    db.select().from(eraMilestones)
      .where(inArray(eraMilestones.eraId, eraIds))
      .orderBy(asc(eraMilestones.sortOrder), asc(eraMilestones.createdAt)),
    db.select({
      id: eraProcessPosts.id,
      eraId: eraProcessPosts.eraId,
      kind: eraProcessPosts.kind,
      title: eraProcessPosts.title,
      body: eraProcessPosts.body,
      imageUrl: eraProcessPosts.imageUrl,
      linkUrl: eraProcessPosts.linkUrl,
      mintedUrl: eraProcessPosts.mintedUrl,
      createdAt: eraProcessPosts.createdAt,
    }).from(eraProcessPosts)
      .where(inArray(eraProcessPosts.eraId, eraIds))
      .orderBy(desc(eraProcessPosts.createdAt)),
  ]);
  return eras.map((e) => ({
    ...e,
    // goal/raised stay server-side until the funding phase ships.
    milestones: milestones.filter((m) => m.eraId === e.id)
      .map(({ goalCents: _g, raisedCents: _r, ...m }) => m),
    posts: posts.filter((p) => p.eraId === e.id).slice(0, 24),
  }));
}

// GET /api/worlds/eras?worldId=X — the world's In Process roadmap (public).
// Deliberately NO CDN caching: a cached s-maxage response made freshly
// created eras "disappear" from the editor for 60s in production. Roadmaps
// are low-traffic; correctness wins.
export async function GET(request: Request) {
  try {
    const worldId = new URL(request.url).searchParams.get('worldId');
    if (!worldId) return NextResponse.json({ error: 'Missing worldId' }, { status: 400 });
    const eras = await erasWithMilestones(worldId);
    return NextResponse.json({ eras }, { headers: NO_STORE });
  } catch (error) {
    console.error('[eras] GET failed:', error);
    return NextResponse.json({ error: 'Failed to load roadmap' }, { status: 500 });
  }
}

// POST /api/worlds/eras — create an era (builders).
export async function POST(request: Request) {
  try {
    const { privyId, worldId, title, description, startDate, endDate, startPrecision, endPrecision, startLabel, endLabel, status, inProcessUrl } = await request.json();
    if (!worldId || !privyId || !title?.trim()) {
      return NextResponse.json({ error: 'worldId and title are required' }, { status: 400 });
    }
    const cleanStatus = String(status || 'active');
    if (!ERA_STATUSES.has(cleanStatus)) {
      return NextResponse.json({ error: 'status must be active, complete, or archived' }, { status: 400 });
    }
    const userId = await verifyWorldBuilder(privyId, worldId);
    if (!userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const [era] = await db.insert(worldEras).values({
      worldId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      startDate: cleanDate(startDate) ?? null,
      endDate: cleanDate(endDate) ?? null,
      startPrecision: cleanPrecision(startPrecision) ?? null,
      endPrecision: cleanPrecision(endPrecision) ?? null,
      startLabel: startLabel ? String(startLabel).trim() : null,
      endLabel: endLabel ? String(endLabel).trim() : null,
      status: cleanStatus,
      inProcessUrl: inProcessUrl ? String(inProcessUrl).trim() : null,
    }).returning();
    return NextResponse.json({ era: { ...era, milestones: [], posts: [] } }, { headers: NO_STORE });
  } catch (error) {
    console.error('[eras] POST failed:', error);
    return NextResponse.json({ error: 'Failed to create era' }, { status: 500 });
  }
}

// PUT /api/worlds/eras — update an era (builders).
export async function PUT(request: Request) {
  try {
    const { privyId, eraId, ...fields } = await request.json();
    if (!eraId || !privyId) return NextResponse.json({ error: 'eraId is required' }, { status: 400 });

    const [era] = await db.select({ worldId: worldEras.worldId }).from(worldEras).where(eq(worldEras.id, eraId)).limit(1);
    if (!era) return NextResponse.json({ error: 'Era not found' }, { status: 404 });
    const userId = await verifyWorldBuilder(privyId, era.worldId);
    if (!userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    if (fields.status !== undefined && !ERA_STATUSES.has(String(fields.status))) {
      return NextResponse.json({ error: 'status must be active, complete, or archived' }, { status: 400 });
    }

    const startDate = cleanDate(fields.startDate);
    const endDate = cleanDate(fields.endDate);
    const startPrecision = cleanPrecision(fields.startPrecision);
    const endPrecision = cleanPrecision(fields.endPrecision);
    await db.update(worldEras).set({
      ...(fields.title !== undefined ? { title: String(fields.title).trim() } : {}),
      ...(fields.description !== undefined ? { description: fields.description ? String(fields.description).trim() : null } : {}),
      ...(startDate !== undefined ? { startDate } : {}),
      ...(endDate !== undefined ? { endDate } : {}),
      ...(startPrecision !== undefined ? { startPrecision } : {}),
      ...(endPrecision !== undefined ? { endPrecision } : {}),
      ...(fields.startLabel !== undefined ? { startLabel: fields.startLabel ? String(fields.startLabel).trim() : null } : {}),
      ...(fields.endLabel !== undefined ? { endLabel: fields.endLabel ? String(fields.endLabel).trim() : null } : {}),
      ...(fields.status !== undefined ? { status: String(fields.status) } : {}),
      ...(fields.inProcessUrl !== undefined ? { inProcessUrl: fields.inProcessUrl ? String(fields.inProcessUrl).trim() : null } : {}),
      updatedAt: new Date(),
    }).where(eq(worldEras.id, eraId));

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[eras] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update era' }, { status: 500 });
  }
}

// DELETE /api/worlds/eras?eraId=X&privyId=Y — removes the era and (cascade)
// its milestones.
export async function DELETE(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const eraId = sp.get('eraId');
    const privyId = sp.get('privyId');
    if (!eraId || !privyId) return NextResponse.json({ error: 'eraId is required' }, { status: 400 });

    const [era] = await db.select({ worldId: worldEras.worldId }).from(worldEras).where(eq(worldEras.id, eraId)).limit(1);
    if (!era) return NextResponse.json({ error: 'Era not found' }, { status: 404 });
    const userId = await verifyWorldBuilder(privyId, era.worldId);
    if (!userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.delete(worldEras).where(eq(worldEras.id, eraId));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[eras] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete era' }, { status: 500 });
  }
}
