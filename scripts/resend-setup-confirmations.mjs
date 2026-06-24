// Find guests who RSVP'd to an event but have no profile handle yet (the
// "complete your profile" cohort) and (optionally) send them the
// event-rsvp-confirmed-setup template.
//
//   node scripts/resend-setup-confirmations.mjs                 # dry run — list only
//   node scripts/resend-setup-confirmations.mjs --send          # actually send
//   EVENT_MATCH='like minds' node scripts/resend-setup-confirmations.mjs
//
// Reads DATABASE_URL, RESEND_API_KEY, INVITE_EMAIL_FROM from .env.local.

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv();

const SEND = process.argv.includes('--send');
// --complete targets guests WITH a profile handle (event-rsvp-confirmed);
// default targets guests WITHOUT one (event-rsvp-confirmed-setup).
const COMPLETE = process.argv.includes('--complete');
const TEMPLATE_ID = COMPLETE ? 'event-rsvp-confirmed' : 'event-rsvp-confirmed-setup';
const MATCH = process.env.EVENT_MATCH || 'like minds';
const ORIGIN = process.env.SITE_ORIGIN || 'https://topia.vision';
const FROM = process.env.INVITE_EMAIL_FROM || 'Topia <noreply@send.topia.vision>';

// Mirrors lib/notify/email.ts formatEventSchedule.
function formatSchedule(ev) {
  let date = '';
  if (ev.date_iso) {
    const d = new Date(`${ev.date_iso}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
  }
  if (!date && ev.date) date = ev.date;
  let time = '';
  if (ev.start_time) {
    time = ev.end_time ? `${ev.start_time} – ${ev.end_time}` : ev.start_time;
    if (ev.timezone) {
      try {
        const tz = new Intl.DateTimeFormat('en-US', { timeZone: ev.timezone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
        if (tz) time += ` ${tz}`;
      } catch {}
    }
  }
  const when = [date, time].filter(Boolean).join(' · ') || 'Date to be announced';
  const where = [ev.address, ev.city].filter(Boolean).join(' · ') || 'Location to be announced';
  return { when, where };
}

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT r.status, u.id AS user_id, u.name, u.username, u.email,
         e.event_name, e.slug, e.date, e.date_iso, e.start_time, e.end_time, e.timezone, e.city, e.address
  FROM event_rsvps r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN users u ON u.id = r.user_id
  WHERE e.event_name ILIKE ${'%' + MATCH + '%'}
  ORDER BY r.created_at ASC
`;

if (rows.length === 0) {
  console.log(`No RSVPs found for an event matching "${MATCH}".`);
  process.exit(0);
}

const eventNames = [...new Set(rows.map((r) => r.event_name))];
console.log(`Event(s) matched: ${eventNames.join(', ')}`);
console.log(`Total RSVPs: ${rows.length}\n`);

const hasHandle = (r) => !!(r.username && r.username.trim());
const hasEmail = (r) => !!(r.email && r.email.trim());
// --complete: guests WITH a handle. default: guests WITHOUT one. Both need an email.
const cohort = (r) => (COMPLETE ? hasHandle(r) : !hasHandle(r)) && hasEmail(r);
const targets = rows.filter(cohort);

console.log(`Guests ${COMPLETE ? 'WITH' : 'with NO'} a profile handle (would get ${TEMPLATE_ID}):`);
for (const r of targets) {
  console.log(`  • ${r.name || '(no name)'}${r.username ? ' @' + r.username : ''} <${r.email}>  [status: ${r.status}]`);
}
const skippedNoEmail = rows.filter((r) => (COMPLETE ? hasHandle(r) : !hasHandle(r)) && !hasEmail(r));
if (skippedNoEmail.length) console.log(`\n(${skippedNoEmail.length} matching RSVP(s) skipped — no email on file.)`);
console.log('');

if (!SEND) {
  console.log('Dry run. Re-run with --send to email the list above.');
  process.exit(0);
}

if (!process.env.RESEND_API_KEY) { console.error('✗ RESEND_API_KEY not set.'); process.exit(1); }

let ok = 0, fail = 0;
for (const r of targets) {
  const { when, where } = formatSchedule(r);
  const variables = {
    GUEST_NAME: r.name || 'there',
    EVENT_NAME: r.event_name,
    EVENT_URL: `${ORIGIN}/events/${r.slug}`,
    EVENT_WHEN: when,
    EVENT_WHERE: where,
    PROFILE_URL: `${ORIGIN}/onboarding`,
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: r.email, template: { id: TEMPLATE_ID, variables } }),
  });
  if (res.ok) { const b = await res.json().catch(() => ({})); console.log(`✓ ${r.email} — ${b.id ?? 'sent'}`); ok++; }
  else { const b = await res.json().catch(() => ({})); console.error(`✗ ${r.email} — ${res.status} ${JSON.stringify(b)}`); fail++; }
}
console.log(`\nDone. Sent ${ok}, failed ${fail}.`);
