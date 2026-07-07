import { NextResponse } from 'next/server';
import { getToolsList } from '@/lib/tools/list';

// Public, viewer-independent list → CDN-cacheable (see /api/profiles).
const LIST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toolsWithUsers = await getToolsList({
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
    });

    return NextResponse.json({
      tools: toolsWithUsers,
      count: toolsWithUsers.length,
    }, { headers: { 'Cache-Control': LIST_CACHE } });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
