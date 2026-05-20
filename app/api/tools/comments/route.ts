import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tools, toolComments } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * Tool comments + 1–5 ratings. Write is gated to users who have the tool
 * in their kit (users.tool_slugs CSV contains the tool.slug). Read is
 * public.
 *
 * GET /api/tools/comments?slug=…
 *   → { comments: [...], canPost: boolean (when viewerPrivyId provided),
 *       averageRating: number | null, ratingCount: number }
 *
 * POST /api/tools/comments  { privyId, slug, body, rating? }
 * DELETE /api/tools/comments?id=…&privyId=…    (author only)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const viewerPrivyId = request.nextUrl.searchParams.get('viewerPrivyId');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    const [tool] = await db.select({ id: tools.id, slug: tools.slug }).from(tools).where(eq(tools.slug, slug)).limit(1);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    const authors = alias(users, 'authors');
    const rows = await db
      .select({
        id: toolComments.id,
        body: toolComments.body,
        rating: toolComments.rating,
        createdAt: toolComments.createdAt,
        authorId: toolComments.userId,
        authorName: authors.name,
        authorUsername: authors.username,
        authorAvatarUrl: authors.avatarUrl,
      })
      .from(toolComments)
      .leftJoin(authors, eq(toolComments.userId, authors.id))
      .where(eq(toolComments.toolId, tool.id))
      .orderBy(desc(toolComments.createdAt));

    const rated = rows.filter((r) => r.rating != null);
    const averageRating = rated.length === 0
      ? null
      : Math.round((rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length) * 10) / 10;

    // Can the viewer post? Requires the tool in their kit.
    let canPost = false;
    if (viewerPrivyId) {
      const [viewer] = await db.select({ toolSlugs: users.toolSlugs }).from(users).where(eq(users.privyId, viewerPrivyId)).limit(1);
      const kit = (viewer?.toolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      canPost = kit.includes(tool.slug);
    }

    return NextResponse.json({
      comments: rows,
      canPost,
      averageRating,
      ratingCount: rated.length,
    });
  } catch (error) {
    console.error('GET tool comments error:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { privyId, slug, body, rating } = await request.json();
    if (!privyId || !slug) return NextResponse.json({ error: 'Missing privyId or slug' }, { status: 400 });
    if (!body?.trim() && rating == null) return NextResponse.json({ error: 'Body or rating required' }, { status: 400 });
    if (rating != null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
    }

    const [user] = await db.select({ id: users.id, toolSlugs: users.toolSlugs }).from(users).where(eq(users.privyId, privyId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const [tool] = await db.select({ id: tools.id, slug: tools.slug }).from(tools).where(eq(tools.slug, slug)).limit(1);
    if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

    // Gate: must have tool in kit
    const kit = (user.toolSlugs ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!kit.includes(tool.slug)) {
      return NextResponse.json({ error: 'Add this tool to your kit to leave a comment.' }, { status: 403 });
    }

    const [inserted] = await db.insert(toolComments).values({
      toolId: tool.id,
      userId: user.id,
      body: body?.trim() || null,
      rating: rating ?? null,
    }).returning();

    return NextResponse.json({ comment: inserted }, { status: 201 });
  } catch (error) {
    console.error('POST tool comments error:', error);
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
    const [comment] = await db.select({ userId: toolComments.userId }).from(toolComments).where(eq(toolComments.id, id)).limit(1);
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (comment.userId !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    await db.delete(toolComments).where(eq(toolComments.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE tool comments error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
