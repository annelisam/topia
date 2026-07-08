import { NextRequest, NextResponse } from 'next/server';
import { sendDueEventReminders } from '@/lib/events/reminders';

// GET /api/cron/event-reminders — Vercel cron entry point (see vercel.json).
// Sends the 24h / 2h reminders for upcoming events; the event_reminders ledger
// makes any cadence or repeat invocation idempotent.
//
// Auth follows the graceful-degradation pattern: when CRON_SECRET is set
// (Vercel injects it as `Authorization: Bearer <secret>` on cron requests),
// it's enforced; when unset we run open but log loudly — the ledger already
// caps abuse at "someone triggers the send a little early, once".
export const maxDuration = 300; // bulk sends are throttled — allow the time

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  } else {
    console.warn('[reminders] CRON_SECRET not set — cron endpoint is unauthenticated');
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://topia.vision';
    const result = await sendDueEventReminders(origin);
    if (result.sent.length > 0) console.log('[reminders] sent:', JSON.stringify(result.sent));
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[reminders] sweep failed:', error);
    return NextResponse.json({ error: 'Reminder sweep failed' }, { status: 500 });
  }
}
