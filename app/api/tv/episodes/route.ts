import { NextResponse } from 'next/server';
import { getTvEpisodes } from '@/lib/tv/episodes';

/**
 * GET /api/tv/episodes — all published episodes. Query lives in
 * lib/tv/episodes.ts (shared with the server-rendered /home page).
 */
export async function GET() {
  try {
    const rows = await getTvEpisodes();
    return NextResponse.json({ episodes: rows });
  } catch (error) {
    console.error('tv episodes GET error:', error);
    return NextResponse.json({ error: 'Failed to load episodes', episodes: [] }, { status: 500 });
  }
}
