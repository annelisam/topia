// The device-local calendar day every "is this event today / over?" decision
// must share. Two hard-won rules live here:
//
//  1. LOCAL time, never UTC. `new Date().toISOString()` rolls to tomorrow at
//     UTC midnight — 8pm in New York — which once flipped a live event to
//     "This event has ended" mid-party and cut everyone off from quests.
//  2. Nights don't end at 00:00. An event that runs 9pm–1am is still ON at
//     half past midnight, so the day doesn't roll over until
//     EVENT_DAY_ROLLOVER_HOUR local — until 4am, "today" is still the
//     previous calendar date.
//
// Every surface (event page, Event Mode, live-now chip/takeover, home +
// events listings) must derive its day from this helper; the moment two of
// them disagree, an event reads as "over" in one place and live in another.
export const EVENT_DAY_ROLLOVER_HOUR = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today as YYYY-MM-DD in the device's timezone, with the late-night grace. */
export function eventLocalToday(now: Date = new Date()): string {
  return fmt(new Date(now.getTime() - EVENT_DAY_ROLLOVER_HOUR * 60 * 60 * 1000));
}

/** N days after eventLocalToday, YYYY-MM-DD (device-local). */
export function eventLocalDayPlus(days: number, now: Date = new Date()): string {
  return fmt(new Date(now.getTime() - EVENT_DAY_ROLLOVER_HOUR * 60 * 60 * 1000 + days * DAY_MS));
}

/** Is this event happening "today" (device-local, late-night grace applied)? */
export function isEventToday(dateIso: string | null | undefined, now: Date = new Date()): boolean {
  if (!dateIso) return false;
  return dateIso.slice(0, 10) === eventLocalToday(now);
}

// ── End-time awareness ─────────────────────────────────────────────────────
// When an event carries its own endTime (and ideally timezone), "over" can be
// exact instead of day-based: the event is over EVENT_OVERRUN_MINUTES after
// its stated end, evaluated in the EVENT's timezone — so a viewer checking an
// LA party from New York doesn't see it "ended" three hours early. Events
// routinely run past their advertised end, hence the buffer. Without a
// parseable endTime, the day-based 4am rule above applies (in the event's
// timezone when known, else the device's).
export const EVENT_OVERRUN_MINUTES = 120;

/** "9:00 PM" / "9 PM" / "21:00" → minutes since midnight, or null. */
export function parseClockTime(t: string | null | undefined): number | null {
  const m = (t ?? '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  const ampm = (m[3] ?? '').toLowerCase();
  let h = Number(m[1]);
  if (ampm) { h %= 12; if (ampm === 'pm') h += 12; }
  if (h > 23 || Number(m[2] ?? 0) > 59) return null;
  return h * 60 + Number(m[2] ?? 0);
}

/** Current calendar day + minutes-since-midnight in the given IANA zone,
 * falling back to the device's zone when the id is missing or unknown. */
function zoneNow(timezone: string | null | undefined, now: Date): { day: string; minutes: number } {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(now);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
      const day = `${get('year')}-${get('month')}-${get('day')}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
      }
    } catch { /* unknown zone id — fall through to the device clock */ }
  }
  return { day: fmt(now), minutes: now.getHours() * 60 + now.getMinutes() };
}

/** dateIso + N days, YYYY-MM-DD. Anchored at noon so DST shifts can't move
 * the calendar day. */
function dayPlus(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return fmt(d);
}

/** Has this event genuinely finished? Exact when endTime is known (stated end
 * + overrun buffer, in the event's timezone); otherwise the day-based 4am
 * rule. An end at-or-before the start means the event crosses midnight
 * (9pm–1am), so the end lands on the next calendar day. */
export function isEventOver(
  ev: { dateIso?: string | null; startTime?: string | null; endTime?: string | null; timezone?: string | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  const dateIso = ev?.dateIso?.slice(0, 10) ?? null;
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return false;
  const { day, minutes } = zoneNow(ev?.timezone, now);

  const endMin = parseClockTime(ev?.endTime);
  if (endMin == null) {
    // No usable end — over from EVENT_DAY_ROLLOVER_HOUR the morning after.
    if (day <= dateIso) return false;
    return !(day === dayPlus(dateIso, 1) && minutes < EVENT_DAY_ROLLOVER_HOUR * 60);
  }

  const startMin = parseClockTime(ev?.startTime);
  let overDay = startMin != null && endMin <= startMin ? dayPlus(dateIso, 1) : dateIso;
  let overAt = endMin + EVENT_OVERRUN_MINUTES;
  if (overAt >= 24 * 60) { overDay = dayPlus(overDay, 1); overAt -= 24 * 60; }
  return day > overDay || (day === overDay && minutes >= overAt);
}
