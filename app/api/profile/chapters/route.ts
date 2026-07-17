import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, lifeChapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const CHAPTER_STATUSES = new Set(['in_motion', 'planned', 'complete', 'witness']);

async function resolveUser(privyId: string | undefined) {
  if (!privyId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  return user ?? null;
}

// POST /api/profile/chapters — add a life chapter to YOUR passport.
export async function POST(request: Request) {
  try {
    const { privyId, title, subtitle, dateLabel, status, sortOrder } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    const cleanStatus = String(status || 'planned');
    if (!CHAPTER_STATUSES.has(cleanStatus)) {
      return NextResponse.json({ error: 'status must be in_motion, planned, complete, or witness' }, { status: 400 });
    }
    const user = await resolveUser(privyId);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [chapter] = await db.insert(lifeChapters).values({
      userId: user.id,
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : null,
      dateLabel: dateLabel ? String(dateLabel).trim() : null,
      status: cleanStatus,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    }).returning();
    return NextResponse.json({ chapter }, { headers: NO_STORE });
  } catch (error) {
    console.error('[chapters] POST failed:', error);
    return NextResponse.json({ error: 'Failed to add chapter' }, { status: 500 });
  }
}

// PUT /api/profile/chapters — update YOUR chapter.
export async function PUT(request: Request) {
  try {
    const { privyId, chapterId, ...fields } = await request.json();
    if (!chapterId) return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
    const user = await resolveUser(privyId);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [existing] = await db.select({ userId: lifeChapters.userId }).from(lifeChapters)
      .where(eq(lifeChapters.id, chapterId)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    if (existing.userId !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    if (fields.status !== undefined && !CHAPTER_STATUSES.has(String(fields.status))) {
      return NextResponse.json({ error: 'status must be in_motion, planned, complete, or witness' }, { status: 400 });
    }

    await db.update(lifeChapters).set({
      ...(fields.title !== undefined ? { title: String(fields.title).trim() } : {}),
      ...(fields.subtitle !== undefined ? { subtitle: fields.subtitle ? String(fields.subtitle).trim() : null } : {}),
      ...(fields.dateLabel !== undefined ? { dateLabel: fields.dateLabel ? String(fields.dateLabel).trim() : null } : {}),
      ...(fields.status !== undefined ? { status: String(fields.status) } : {}),
      ...(fields.sortOrder !== undefined ? { sortOrder: Number(fields.sortOrder) } : {}),
      updatedAt: new Date(),
    }).where(eq(lifeChapters.id, chapterId));

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[chapters] PUT failed:', error);
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
  }
}

// DELETE /api/profile/chapters?chapterId=X&privyId=Y
export async function DELETE(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const chapterId = sp.get('chapterId');
    const user = await resolveUser(sp.get('privyId') ?? undefined);
    if (!chapterId) return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [existing] = await db.select({ userId: lifeChapters.userId }).from(lifeChapters)
      .where(eq(lifeChapters.id, chapterId)).limit(1);
    if (!existing) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    if (existing.userId !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.delete(lifeChapters).where(eq(lifeChapters.id, chapterId));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[chapters] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}
