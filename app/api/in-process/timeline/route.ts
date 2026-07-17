import { NextResponse } from 'next/server';
import { extractArtistAddress, fetchArtistTimeline } from '@/lib/inProcess';

// GET /api/in-process/timeline?artist=<address-or-inprocess-url>
// Cached proxy for an artist's public In Process timeline — the "proof of
// work / process log" strip under a world era. Public data, aggressively
// cached; any upstream failure returns an empty list (graceful degradation).
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get('artist');
    const artist = extractArtistAddress(raw);
    if (!artist) return NextResponse.json({ moments: [] }, { status: 200 });

    const moments = await fetchArtistTimeline(artist, 8);
    return NextResponse.json(
      { moments, artist },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } },
    );
  } catch (error) {
    console.error('[in-process] timeline proxy failed:', error);
    return NextResponse.json({ moments: [] }, { status: 200 });
  }
}
