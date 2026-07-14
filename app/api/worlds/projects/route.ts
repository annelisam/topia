import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldProjects, worldMembers, projectMembers, users } from '@/lib/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

// Fetch a project's credits with the credited person's public profile bits.
async function getCredits(projectId: string) {
  return db
    .select({
      userId: projectMembers.userId,
      role: projectMembers.role,
      name: users.name,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(projectMembers.createdAt));
}

// Replace a project's credits. Only world members can be credited — anything
// else in the payload is silently dropped rather than 400ing the whole save.
async function replaceCredits(projectId: string, worldId: string, credits: unknown) {
  if (!Array.isArray(credits)) return;
  const wanted = credits
    .filter((c): c is { userId: string; role?: string } => Boolean(c && typeof c.userId === 'string'))
    .slice(0, 30);
  const memberRows = wanted.length
    ? await db
        .select({ userId: worldMembers.userId })
        .from(worldMembers)
        .where(and(eq(worldMembers.worldId, worldId), inArray(worldMembers.userId, wanted.map((c) => c.userId))))
    : [];
  const allowed = new Set(memberRows.map((m) => m.userId));
  const seen = new Set<string>();
  const rows = wanted.filter((c) => {
    if (!allowed.has(c.userId) || seen.has(c.userId)) return false;
    seen.add(c.userId);
    return true;
  });
  await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
  if (rows.length > 0) {
    await db.insert(projectMembers).values(
      rows.map((c) => ({ projectId, userId: c.userId, role: typeof c.role === 'string' && c.role.trim() ? c.role.trim().slice(0, 80) : null })),
    );
  }
}

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
      const credits = await getCredits(result[0].id);
      return NextResponse.json({ project: { ...result[0], credits } });
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
    const { worldId, privyId, name, description, content, imageUrl, videoUrl, url, links, tags, credits } = data;

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

    await replaceCredits(result[0].id, worldId, credits);

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

    // Scope by worldId too — the builder check above authorizes the SUBMITTED
    // world, so the project must actually belong to it.
    const result = await db.update(worldProjects)
      .set(updateData)
      .where(and(eq(worldProjects.id, projectId), eq(worldProjects.worldId, worldId)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (fields.credits !== undefined) await replaceCredits(projectId, worldId, fields.credits);

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

    await db.delete(worldProjects).where(and(eq(worldProjects.id, projectId), eq(worldProjects.worldId, worldId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting world project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
