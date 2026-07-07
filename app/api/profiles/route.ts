import { NextRequest, NextResponse } from 'next/server';
import { getPublicProfiles } from '@/lib/profile/list';

// Public, viewer-independent list → let the CDN serve repeat hits. Short fresh
// window + a longer stale-while-revalidate keeps it snappy without going stale.
const LIST_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

// GET /api/profiles — public list of discoverable profiles (anyone who has
// claimed a username). Powers the "Discover" carousel and /topians.
//   ?limit=24        (max 48; max 500 with all=1)
//   ?complete=1      only fully-filled profiles (photo + name + tags), where
//                    "photo" means a real upload — generated avatars excluded
//   ?all=1           the full directory for /topians (raises the limit cap)
// Query logic lives in lib/profile/list.ts (shared with /home SSR).
export async function GET(request: NextRequest) {
  const allMode = request.nextUrl.searchParams.get('all') === '1';
  const maxLimit = allMode ? 500 : 48;
  const limit = Math.min(maxLimit, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 24));
  const completeOnly = request.nextUrl.searchParams.get('complete') === '1';
  try {
    const profiles = await getPublicProfiles({ limit, completeOnly });
    return NextResponse.json({ profiles }, { headers: { 'Cache-Control': LIST_CACHE } });
  } catch (error) {
    console.error('GET profiles error:', error);
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
  }
}
