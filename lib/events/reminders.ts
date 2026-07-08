import { db, events, eventRsvps, eventReminders, users, notifications } from '@/lib/db';
import { and, eq, gte } from 'drizzle-orm';
import { isEmailConfigured, sendBulkEmails, formatEventSchedule } from '@/lib/notify/email';

// ── Event start-time resolution ───────────────────────────────────────────
// Events store their schedule as display-oriented parts (dateIso "2026-07-18",
// startTime "9:00 PM", timezone "America/Los_Angeles"), never a real
// timestamp. Reminders need an absolute instant, so we reassemble one here.
// Events without a timezone default to America/New_York (the platform's home
// base); events without a start time count as starting at 00:00 local.

const DEFAULT_TIMEZONE = 'America/New_York';

function parseClock(startTime: string | null): { h: number; m: number } {
  if (!startTime) return { h: 0, m: 0 };
  const m = startTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return { h: 0, m: 0 };
  let h = Number(m[1]) % 12;
  const min = Number(m[2] ?? 0);
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm') h += 12;
  if (!mer) h = Number(m[1]); // 24h form like "21:00"
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, min)) };
}

// What a UTC instant reads as on a wall clock in `tz`, expressed as a UTC ms
// value — the difference to the instant itself is the zone offset.
function wallClockAsUtc(ts: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
}

/** Absolute start of an event, or null when it has no usable date. */
export function eventStartsAt(ev: { dateIso: string | null; startTime: string | null; timezone: string | null }): Date | null {
  if (!ev.dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(ev.dateIso)) return null;
  const [y, mo, d] = ev.dateIso.split('-').map(Number);
  const { h, m } = parseClock(ev.startTime);
  const tz = ev.timezone || DEFAULT_TIMEZONE;
  // Two-pass zone conversion (second pass corrects DST-boundary drift).
  let ts = Date.UTC(y, mo - 1, d, h, m);
  try {
    for (let i = 0; i < 2; i++) {
      const offset = wallClockAsUtc(ts, tz) - ts;
      ts = Date.UTC(y, mo - 1, d, h, m) - offset;
    }
  } catch {
    // Unknown timezone string — fall back to treating the time as UTC.
    ts = Date.UTC(y, mo - 1, d, h, m);
  }
  return new Date(ts);
}

// ── Reminder email (raw HTML via the batch sender — no Resend template to
//    paste; mirrors the generated templates' look) ─────────────────────────

const LOGO = 'https://topia.vision/brand/email-logo.png';

function reminderHtml(opts: { headline: string; eventName: string; when: string; where: string; url: string }): string {
  const hl = (t: string) =>
    `<span style="display:inline-block;background:#e4fe52;color:#000000;padding:3px 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${t}</span>`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#111111;border:1px solid rgba(136,136,136,0.25);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0 32px;"><img src="${LOGO}" alt="TOPIA" width="96" style="display:block;border:0;" /></td></tr>
        <tr><td style="padding:24px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#f5f0e8;">
          <div style="padding-bottom:10px;">${hl(opts.headline)}</div>
          <div style="font-size:22px;font-weight:bold;line-height:1.25;text-transform:uppercase;">${opts.eventName}</div>
        </td></tr>
        <tr><td style="padding:20px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#f5f0e8;">
          <div style="padding-bottom:6px;">${hl('When')}</div>
          <div style="font-size:15px;line-height:1.4;padding-bottom:14px;">${opts.when}</div>
          <div style="padding-bottom:6px;">${hl('Where')}</div>
          <div style="font-size:15px;line-height:1.4;">${opts.where}</div>
        </td></tr>
        <tr><td style="padding:26px 32px 0 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="#e4fe52" style="border-radius:8px;">
              <a href="${opts.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#000000;text-decoration:none;border-radius:8px;">View event &rarr;</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 32px 30px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;">You're getting this because you RSVP'd on TOPIA.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── The sweep ─────────────────────────────────────────────────────────────
// Windows are wider than the cron cadence so a delayed or skipped tick never
// loses a reminder — the ledger (unique event+kind) keeps re-runs idempotent.
//   '24h': starts within (now, now+26h], meant to land ~a day out
//   '2h' : starts within (now, now+3h]
const WINDOWS: { kind: '24h' | '2h'; maxMs: number; headline: string; subject: (n: string) => string }[] = [
  { kind: '24h', maxMs: 26 * 3600_000, headline: 'Tomorrow', subject: (n) => `Tomorrow: ${n}` },
  { kind: '2h', maxMs: 3 * 3600_000, headline: 'Starting soon', subject: (n) => `Starting soon: ${n}` },
];

export interface ReminderSweepResult {
  checked: number;
  sent: { eventId: string; kind: string; recipients: number }[];
}

export async function sendDueEventReminders(origin: string): Promise<ReminderSweepResult> {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  // Candidates: published, platform-native, dated today or later. (dateIso is
  // a lexicographically sortable YYYY-MM-DD string.)
  const candidates = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      slug: events.slug,
      date: events.date,
      dateIso: events.dateIso,
      startTime: events.startTime,
      endTime: events.endTime,
      timezone: events.timezone,
      city: events.city,
      address: events.address,
      externalSource: events.externalSource,
      published: events.published,
    })
    .from(events)
    .where(and(eq(events.published, true), gte(events.dateIso, today)));

  const result: ReminderSweepResult = { checked: candidates.length, sent: [] };

  for (const ev of candidates) {
    if (ev.externalSource) continue; // RSVPs live on the external platform
    const startsAt = eventStartsAt(ev);
    if (!startsAt) continue;
    const untilStart = startsAt.getTime() - now;
    if (untilStart <= 0) continue;

    for (const w of WINDOWS) {
      if (untilStart > w.maxMs) continue;

      // Claim the (event, kind) slot BEFORE sending — the unique index makes
      // a concurrent or repeated run a clean no-op instead of a double-send.
      let claimed = false;
      try {
        await db.insert(eventReminders).values({ eventId: ev.id, kind: w.kind });
        claimed = true;
      } catch {
        claimed = false; // already sent (or being sent) by another run
      }
      if (!claimed) continue;

      const guests = await db
        .select({ userId: eventRsvps.userId, email: users.email, name: users.name })
        .from(eventRsvps)
        .innerJoin(users, eq(eventRsvps.userId, users.id))
        .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.status, 'going')));

      // In-app notification for every confirmed guest.
      for (const g of guests) {
        try {
          await db.insert(notifications).values({
            recipientId: g.userId,
            actorId: g.userId, // system event — the guest is their own actor
            type: 'event_reminder',
            metadata: { eventId: ev.id, eventName: ev.eventName, eventSlug: ev.slug, kind: w.kind },
          });
        } catch (e) {
          console.error('[reminders] notification failed:', e);
        }
      }

      let emailed = 0;
      const withEmail = guests.filter((g) => g.email);
      if (withEmail.length > 0 && isEmailConfigured()) {
        const { when, where } = formatEventSchedule(ev);
        const html = reminderHtml({
          headline: w.headline,
          eventName: ev.eventName,
          when,
          where,
          url: `${origin}/events/${ev.slug}`,
        });
        const bulk = await sendBulkEmails(
          withEmail.map((g) => ({ to: g.email!, subject: w.subject(ev.eventName), html })),
        );
        emailed = bulk.sent;
        if (bulk.failed > 0) console.error(`[reminders] ${ev.slug} ${w.kind}: ${bulk.failed}/${bulk.total} emails failed`, bulk.errors);
      }

      await db
        .update(eventReminders)
        .set({ recipients: emailed })
        .where(and(eq(eventReminders.eventId, ev.id), eq(eventReminders.kind, w.kind)));

      result.sent.push({ eventId: ev.id, kind: w.kind, recipients: emailed });
    }
  }

  return result;
}
