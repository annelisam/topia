import { NextRequest, NextResponse } from 'next/server';
import { sendProfileNudges } from '@/lib/notify/profileNudge';

// GET /api/cron/profile-nudge — Vercel cron entry point (see vercel.json).
// One-time "finish your passport" email to signed-up users with no username;
// the sweep no-ops unless PROFILE_NUDGE_ENABLED=1, so deploying the schedule
// alone sends nothing.
//
// Auth mirrors the other crons: CRON_SECRET enforced when set; unset runs
// open but logs loudly — the per-user ledger caps abuse at one early email.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  } else {
    console.warn('[profile-nudge] CRON_SECRET not set — cron endpoint is unauthenticated');
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://topia.vision';
    const result = await sendProfileNudges(origin);
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[profile-nudge] sweep failed:', error);
    return NextResponse.json({ error: 'Nudge sweep failed' }, { status: 500 });
  }
}
