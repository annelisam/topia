import { NextRequest, NextResponse } from 'next/server';
import { sendDmDigests } from '@/lib/notify/dmDigest';

// GET /api/cron/dm-digest — Vercel cron entry point (see vercel.json).
// Daily unread-DM digest; the sweep itself no-ops unless DM_DIGEST_ENABLED=1,
// so deploying the cron schedule alone sends nothing.
//
// Auth mirrors event-reminders: CRON_SECRET enforced when set (Vercel injects
// it as a Bearer header on cron requests); unset runs open but logs loudly —
// worst case someone triggers a digest of already-unread messages early.
export const maxDuration = 300; // bulk sends are throttled — allow the time

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  } else {
    console.warn('[dm-digest] CRON_SECRET not set — cron endpoint is unauthenticated');
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://topia.vision';
    const result = await sendDmDigests(origin);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[dm-digest] sweep failed:', error);
    return NextResponse.json({ error: 'Digest sweep failed' }, { status: 500 });
  }
}
