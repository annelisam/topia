import { NextRequest, NextResponse } from 'next/server';
import { getEventsOverview } from '@/lib/events/overview';

/**
 * GET /api/events/overview?privyId=...&city=...
 * Single endpoint for the /events page. Query logic lives in
 * lib/events/overview.ts (shared with the server-rendered /events page).
 */
export async function GET(request: NextRequest) {
  const privyId = request.nextUrl.searchParams.get('privyId');
  const cityFilter = request.nextUrl.searchParams.get('city');

  try {
    const overview = await getEventsOverview({ privyId, city: cityFilter });
    return NextResponse.json(overview, {
      // Viewer-specific flags ride along when privyId is present — never cache those.
      headers: { 'Cache-Control': privyId ? 'private, no-store' : 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Events overview error:', error);
    return NextResponse.json({ events: [], cities: [], mySavedSlugs: [], currentUserId: null });
  }
}
