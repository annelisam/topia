import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, worldMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { scrapeGrantPage, ScraperError } from '@/lib/scraper';

// Simple in-memory rate limiter: 10 requests per user per 10 minutes
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 10 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW);
  rateLimitMap.set(userId, recent);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.url || !data.privyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate URL format early
    try {
      new URL(data.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Verify user exists and is associated with a world
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.privyId, data.privyId))
      .limit(1);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const memberships = await db
      .select({ id: worldMembers.id })
      .from(worldMembers)
      .where(eq(worldMembers.userId, user.id))
      .limit(1);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'Must be associated with a world to parse grants' },
        { status: 403 }
      );
    }

    // Rate limit
    if (!checkRateLimit(data.privyId)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    // Scrape and parse
    const result = await scrapeGrantPage(data.url);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ScraperError) {
      const messages: Record<string, string> = {
        INVALID_URL: 'Invalid URL. Please check the link and try again.',
        FETCH_FAILED: 'Could not fetch the page. Check the URL and try again.',
        NOT_HTML: 'The URL does not point to an HTML page.',
        SSRF_BLOCKED: 'Cannot fetch internal URLs.',
      };
      return NextResponse.json(
        { error: messages[err.code] || err.message },
        { status: 422 }
      );
    }
    console.error('Parse URL error:', err);
    return NextResponse.json({ error: 'Failed to parse URL' }, { status: 500 });
  }
}
