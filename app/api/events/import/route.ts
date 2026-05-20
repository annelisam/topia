import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * POST /api/events/import
 * Body: { url: string }
 *
 * Server-side fetches the URL, extracts event metadata from OG tags
 * + JSON-LD (schema.org/Event) when available, and returns a normalized
 * shape the client can drop into the create-event form.
 *
 * Supports: Luma (lu.ma, luma.com), Partiful (partiful.com),
 * Eventbrite (eventbrite.com), and generic OG-tagged pages.
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Validate URL + detect platform
    let parsed: URL;
    try { parsed = new URL(url.includes('://') ? url : `https://${url}`); }
    catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const source =
      host === 'lu.ma' || host.endsWith('.lu.ma') || host === 'luma.com' || host.endsWith('.luma.com') ? 'luma'
      : host === 'partiful.com' || host.endsWith('.partiful.com') ? 'partiful'
      : host === 'eventbrite.com' || host.endsWith('.eventbrite.com') || host.endsWith('.eventbrite.co.uk') ? 'eventbrite'
      : 'other';

    // Fetch the page server-side
    const res = await fetch(parsed.toString(), {
      headers: {
        // Mimic a normal browser so platforms don't serve a stub page
        'User-Agent': 'Mozilla/5.0 (compatible; TopiaBot/1.0; +https://topia.so)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // Short-ish timeout via AbortSignal
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch (${res.status})` }, { status: 502 });
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // ── OG / Twitter / meta fallback chain ──
    const og = (prop: string) => $(`meta[property="og:${prop}"]`).attr('content') ?? $(`meta[name="og:${prop}"]`).attr('content');
    const tw = (name: string) => $(`meta[name="twitter:${name}"]`).attr('content');
    const meta = (name: string) => $(`meta[name="${name}"]`).attr('content');

    // ── Try JSON-LD schema.org/Event (Luma + Eventbrite expose this) ──
    interface JsonLdEvent {
      '@type'?: string | string[];
      name?: string;
      description?: string;
      image?: string | string[] | { url?: string };
      startDate?: string;
      endDate?: string;
      url?: string;
      location?: {
        name?: string;
        address?: string | { addressLocality?: string; streetAddress?: string; addressRegion?: string };
      } | string;
    }
    // Collect all JSON-LD blocks first, then find the Event entry.
    // (Doing it via $.each closure trips up TS narrowing on the local let.)
    const jsonLdBlocks: JsonLdEvent[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const candidates: JsonLdEvent[] = Array.isArray(data)
          ? data
          : Array.isArray(data['@graph'])
          ? data['@graph']
          : [data];
        jsonLdBlocks.push(...candidates);
      } catch { /* malformed JSON-LD — ignore */ }
    });
    const jsonLd: JsonLdEvent | null = jsonLdBlocks.find((c) => {
      const t = c?.['@type'];
      return t === 'Event' || (Array.isArray(t) && t.includes('Event'));
    }) ?? null;

    // ── Compose result ──
    const title =
      jsonLd?.name
      ?? og('title')
      ?? tw('title')
      ?? $('title').text()?.trim()
      ?? '';

    const description =
      jsonLd?.description
      ?? og('description')
      ?? tw('description')
      ?? meta('description')
      ?? '';

    let imageUrl: string | null = null;
    if (jsonLd?.image) {
      if (typeof jsonLd.image === 'string') imageUrl = jsonLd.image;
      else if (Array.isArray(jsonLd.image) && typeof jsonLd.image[0] === 'string') imageUrl = jsonLd.image[0];
      else if (typeof jsonLd.image === 'object' && 'url' in jsonLd.image) imageUrl = jsonLd.image.url ?? null;
    }
    imageUrl = imageUrl ?? og('image') ?? og('image:url') ?? tw('image') ?? null;

    // Date/time from JSON-LD if present
    let dateIso: string | null = null;
    let startTime: string | null = null;
    let timezone: string | null = null;
    if (jsonLd?.startDate) {
      try {
        const d = new Date(jsonLd.startDate);
        if (!isNaN(d.getTime())) {
          // dateIso: YYYY-MM-DD in original timezone if we can detect, else UTC
          const offsetMatch = jsonLd.startDate.match(/[+-]\d{2}:?\d{2}|Z$/);
          if (offsetMatch && offsetMatch[0] !== 'Z') {
            // Use UTC parts shifted into the original offset for a stable yyyy-mm-dd
            dateIso = jsonLd.startDate.slice(0, 10);
            startTime = formatStartTime(jsonLd.startDate.slice(11, 16));
            timezone = offsetMatch[0];
          } else {
            dateIso = d.toISOString().slice(0, 10);
            startTime = formatStartTime(d.toISOString().slice(11, 16));
            timezone = 'UTC';
          }
        }
      } catch { /* ignore */ }
    }

    // Location → city
    let city: string | null = null;
    let address: string | null = null;
    if (jsonLd?.location) {
      const loc = jsonLd.location;
      if (typeof loc === 'string') {
        city = loc;
      } else {
        city = loc.name ?? null;
        if (loc.address) {
          if (typeof loc.address === 'string') address = loc.address;
          else {
            city = loc.address.addressLocality ?? city;
            address = loc.address.streetAddress ?? null;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      source,
      url: parsed.toString(),
      data: {
        title: stripWhitespace(title),
        description: stripWhitespace(description),
        imageUrl,
        dateIso,
        startTime,
        timezone,
        city,
        address,
        link: parsed.toString(),
      },
    });
  } catch (error) {
    console.error('Event import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to import';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function stripWhitespace(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim();
}

function formatStartTime(hhmm: string): string {
  // "21:30" → "9:30 PM"
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
