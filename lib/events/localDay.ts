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

/** Strictly before today (device-local) — i.e. genuinely over, not just past
 * UTC midnight and not just past 00:00 during the event's own night. */
export function isEventPast(dateIso: string | null | undefined, now: Date = new Date()): boolean {
  if (!dateIso) return false;
  return dateIso.slice(0, 10) < eventLocalToday(now);
}
