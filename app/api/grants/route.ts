import { NextResponse } from 'next/server';
import { getGrantsList } from '@/lib/grants/list';

// Public, viewer-independent list → CDN-cacheable (see /api/profiles).
const LIST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const visible = await getGrantsList({
      search: searchParams.get('search'),
      tag: searchParams.get('tag'),
      sortBy: searchParams.get('sortBy'),
    });

    return NextResponse.json({
      grants: visible,
      count: visible.length,
    }, { headers: { 'Cache-Control': LIST_CACHE } });
  } catch (error) {
    console.error('Error fetching grants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    );
  }
}
