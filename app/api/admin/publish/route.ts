import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import {
  db,
  worlds,
  creators,
  events,
  grants,
  tools,
  catalysts,
  tvContent,
  tvEpisodes,
  worldProjects,
} from '@/lib/db';
import { isAdminRequest } from '@/lib/adminAuth';

// One endpoint to publish/unpublish any content type that carries a `published`
// flag. User profiles are intentionally excluded. Each entry maps a public
// `type` string to its table + the column to show as a label.
const REGISTRY = {
  worlds: { table: worlds, name: worlds.title },
  creators: { table: creators, name: creators.name },
  events: { table: events, name: events.eventName },
  grants: { table: grants, name: grants.grantName },
  tools: { table: tools, name: tools.name },
  catalysts: { table: catalysts, name: catalysts.name },
  'tv-content': { table: tvContent, name: tvContent.title },
  'tv-episodes': { table: tvEpisodes, name: tvEpisodes.title },
  'world-projects': { table: worldProjects, name: worldProjects.name },
} as const;

type ContentType = keyof typeof REGISTRY;

function resolve(type: string | null) {
  if (type && type in REGISTRY) return REGISTRY[type as ContentType];
  return null;
}

// GET /api/admin/publish?type=catalysts → list items (id, name, slug, published)
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const cfg = resolve(type);
  if (!cfg) {
    return NextResponse.json({ error: 'Unknown or missing type' }, { status: 400 });
  }
  try {
    const rows = await db
      .select({
        id: cfg.table.id,
        name: cfg.name,
        slug: cfg.table.slug,
        published: cfg.table.published,
      })
      .from(cfg.table)
      .orderBy(asc(cfg.name));
    return NextResponse.json({ items: rows });
  } catch (error) {
    console.error('Admin GET publish:', error);
    return NextResponse.json({ error: 'Failed to list items' }, { status: 500 });
  }
}

// POST /api/admin/publish  body: { type, id, published }
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { type, id, published } = await request.json();
    if (!id || typeof published !== 'boolean') {
      return NextResponse.json({ error: 'id and published(boolean) are required' }, { status: 400 });
    }
    const cfg = resolve(type);
    if (!cfg) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

    const [updated] = await db
      .update(cfg.table)
      .set({ published })
      .where(eq(cfg.table.id, id))
      .returning({ id: cfg.table.id, published: cfg.table.published });

    if (!updated) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    console.error('Admin POST publish:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
