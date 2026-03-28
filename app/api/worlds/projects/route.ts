import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldProjects, worldMembers, users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

// GET – fetch projects for a world
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const worldId = searchParams.get('worldId');

    if (!worldId) {
      return NextResponse.json({ error: 'Missing worldId' }, { status: 400 });
    }

    const slug = searchParams.get('slug');

    if (slug) {
      const result = await db
        .select()
        .from(worldProjects)
        .where(and(eq(worldProjects.worldId, worldId), eq(worldProjects.slug, slug)))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json({ project: result[0] });
    }

    const projects = await db
      .select()
      .from(worldProjects)
      .where(eq(worldProjects.worldId, worldId))
      .orderBy(asc(worldProjects.sortOrder), asc(worldProjects.name));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching world projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// Helper: verify world_builder membership
async function verifyWorldBuilder(privyId: string, worldId: string) {
  const userResult = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.privyId, privyId))
    .limit(1);

  if (userResult.length === 0) return null;

  const membership = await db
    .select({ id: worldMembers.id })
    .from(worldMembers)
    .where(
      and(
        eq(worldMembers.worldId, worldId),
        eq(worldMembers.userId, userResult[0].id),
        eq(worldMembers.role, 'world_builder')
      )
    )
    .limit(1);

  return membership.length > 0 ? userResult[0].id : null;
}

// POST – create a project
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { worldId, privyId, name, description, content, imageUrl, videoUrl, url, links, tags } = data;

    if (!worldId || !privyId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await verifyWorldBuilder(privyId, worldId);
    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const result = await db.insert(worldProjects).values({
      worldId,
      name,
      slug,
      description: description || null,
      content: content || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      url: url || null,
      links: links || null,
      tags: tags || null,
    }).returning();

    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error('Error creating world project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT – update a project
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { projectId, worldId, privyId, ...fields } = data;

    if (!projectId || !worldId || !privyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await verifyWorldBuilder(privyId, worldId);
    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.name !== undefined) {
      updateData.name = fields.name;
      updateData.slug = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (fields.description !== undefined) updateData.description = fields.description || null;
    if (fields.content !== undefined) updateData.content = fields.content || null;
    if (fields.imageUrl !== undefined) updateData.imageUrl = fields.imageUrl || null;
    if (fields.videoUrl !== undefined) updateData.videoUrl = fields.videoUrl || null;
    if (fields.url !== undefined) updateData.url = fields.url || null;
    if (fields.links !== undefined) updateData.links = fields.links || null;
    if (fields.tags !== undefined) updateData.tags = fields.tags || null;

    const result = await db.update(worldProjects)
      .set(updateData)
      .where(eq(worldProjects.id, projectId))
      .returning();

    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error('Error updating world project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE – remove a project
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const { projectId, worldId, privyId } = data;

    if (!projectId || !worldId || !privyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = await verifyWorldBuilder(privyId, worldId);
    if (!userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.delete(worldProjects).where(eq(worldProjects.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting world project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
