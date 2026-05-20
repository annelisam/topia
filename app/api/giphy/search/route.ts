import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/giphy/search?q=…&limit=20
 *
 * Server-side proxy to Giphy's Search endpoint. Keeps the API key off the
 * client. Returns a slimmed shape (id + preview + downsized URLs + title)
 * suitable for picker UI.
 *
 * Env: GIPHY_API_KEY — set in .env.local / Vercel project env vars.
 * Get one at https://developers.giphy.com (free tier is plenty).
 *
 * Empty query → returns trending instead (Giphy's "trending" endpoint).
 */
const GIPHY_API = 'https://api.giphy.com/v1/gifs';

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_width:           GiphyImage;
    fixed_width_small:     GiphyImage;
    downsized_medium?:     GiphyImage;
    original?:             GiphyImage;
  };
}

export async function GET(request: NextRequest) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'GIPHY_API_KEY is not configured. Set it in your env (see https://developers.giphy.com).' },
      { status: 500 },
    );
  }

  const q     = request.nextUrl.searchParams.get('q')     ?? '';
  const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10) || 20);

  const url = q.trim()
    ? `${GIPHY_API}/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`
    : `${GIPHY_API}/trending?api_key=${encodeURIComponent(key)}&limit=${limit}&rating=pg-13`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Giphy returned ${res.status}` }, { status: 502 });
    }
    const json = await res.json() as { data: GiphyGif[] };
    const gifs = (json.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      // Small preview for the picker grid
      preview: g.images.fixed_width_small?.url || g.images.fixed_width.url,
      previewWidth:  g.images.fixed_width_small?.width || g.images.fixed_width.width,
      previewHeight: g.images.fixed_width_small?.height || g.images.fixed_width.height,
      // The URL we actually persist when the user picks it
      url:    g.images.downsized_medium?.url || g.images.fixed_width.url,
      width:  g.images.downsized_medium?.width  || g.images.fixed_width.width,
      height: g.images.downsized_medium?.height || g.images.fixed_width.height,
    }));
    return NextResponse.json({ gifs });
  } catch (error) {
    console.error('giphy search error:', error);
    return NextResponse.json({ error: 'Giphy fetch failed' }, { status: 502 });
  }
}
