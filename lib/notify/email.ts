// Transactional event email — sends via Resend *Templates*. The copy/subject/
// design lives in the Resend dashboard; our code only triggers a template by id
// and passes variables. Dependency-free (plain fetch) and env-gated: dormant
// until RESEND_API_KEY is set, then auto-on. Mirrors lib/notify/invites.ts.
//
// Create these templates in Resend (Dashboard → Templates) and PUBLISH them.
// Variables use triple-brace syntax in the template, e.g. {{{EVENT_NAME}}}.
//
//   event-invite          → EVENT_NAME, EVENT_URL, INVITER_NAME
//   event-rsvp-confirmed   → EVENT_NAME, EVENT_URL, GUEST_NAME   (instant RSVP)
//   event-rsvp-requested   → EVENT_NAME, EVENT_URL, GUEST_NAME   (approval on)
//   event-rsvp-approved    → EVENT_NAME, EVENT_URL, GUEST_NAME
//   event-rsvp-declined    → EVENT_NAME, EVENT_URL, GUEST_NAME
//   event-host-rsvp-alert  → EVENT_NAME, MANAGE_URL, GUEST_NAME, STATUS
//   complete-your-profile  → USER_NAME, PROFILE_URL   (new-signup nudge)
//
// Template ids default to the slugs above but can be overridden per-env so you
// can rename in Resend without a code change.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const EVENT_TEMPLATES = {
  invite:        process.env.RESEND_TPL_EVENT_INVITE        || 'event-invite',
  rsvpConfirmed: process.env.RESEND_TPL_RSVP_CONFIRMED      || 'event-rsvp-confirmed',
  rsvpRequested: process.env.RESEND_TPL_RSVP_REQUESTED      || 'event-rsvp-requested',
  rsvpApproved:  process.env.RESEND_TPL_RSVP_APPROVED       || 'event-rsvp-approved',
  rsvpDeclined:  process.env.RESEND_TPL_RSVP_DECLINED       || 'event-rsvp-declined',
  hostAlert:     process.env.RESEND_TPL_HOST_RSVP_ALERT     || 'event-host-rsvp-alert',
  completeProfile: process.env.RESEND_TPL_COMPLETE_PROFILE  || 'complete-your-profile',
} as const;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

type Vars = Record<string, string | number>;

// Core sender: renders a dashboard template by id with the given variables.
// Best-effort — returns a reason instead of throwing so callers never break.
export async function sendTemplateEmail(opts: { to: string; templateId: string; variables: Vars }): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'not_configured' };
  if (!opts.to) return { sent: false, reason: 'no_recipient' };
  const from = process.env.INVITE_EMAIL_FROM || 'Topia <onboarding@resend.dev>';
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: opts.to, template: { id: opts.templateId, variables: opts.variables } }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `resend_${res.status}` };
  } catch {
    return { sent: false, reason: 'resend_error' };
  }
}

function eventUrl(origin: string, slug: string): string {
  return `${origin}/events/${slug}`;
}

// Build human-readable "when" and "where" lines for email bodies from the raw
// event fields. Returns friendly fallbacks (never empty) so templates can render
// the rows unconditionally.
export interface EventScheduleFields {
  date?: string | null;
  dateIso?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  city?: string | null;
  address?: string | null;
}

export function formatEventSchedule(ev: EventScheduleFields): { when: string; where: string } {
  // Date — prefer the sortable ISO (parsed as UTC to avoid an off-by-one day),
  // else fall back to the stored display string.
  let date = '';
  if (ev.dateIso) {
    const d = new Date(`${ev.dateIso}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
    }
  }
  if (!date && ev.date) date = ev.date;

  // Time — "1:00 PM – 5:00 PM PT" (short tz label when we can derive one).
  let time = '';
  if (ev.startTime) {
    time = ev.endTime ? `${ev.startTime} – ${ev.endTime}` : ev.startTime;
    if (ev.timezone) {
      try {
        const tz = new Intl.DateTimeFormat('en-US', { timeZone: ev.timezone, timeZoneName: 'short' })
          .formatToParts(new Date())
          .find((p) => p.type === 'timeZoneName')?.value;
        if (tz) time += ` ${tz}`;
      } catch { /* unknown tz — skip the label */ }
    }
  }

  const when = [date, time].filter(Boolean).join(' · ') || 'Date to be announced';
  const where = [ev.address, ev.city].filter(Boolean).join(' · ') || 'Location to be announced';
  return { when, where };
}

// ── Per-touchpoint senders ────────────────────────────────────────────────
// (Invites send via sendTemplateEmail directly from lib/notify/invites.ts so
//  they can pass their tokenized accept URL as EVENT_URL.)

// Guest confirmation right after they register (instant vs approval-pending).
export function sendRsvpConfirmation(opts: { to: string; eventName: string; origin: string; slug: string; guestName?: string | null; approvalRequired: boolean }) {
  return sendTemplateEmail({
    to: opts.to,
    templateId: opts.approvalRequired ? EVENT_TEMPLATES.rsvpRequested : EVENT_TEMPLATES.rsvpConfirmed,
    variables: { EVENT_NAME: opts.eventName, EVENT_URL: eventUrl(opts.origin, opts.slug), GUEST_NAME: opts.guestName || 'there' },
  });
}

// Host approves or declines a pending request.
export function sendRsvpDecision(opts: { to: string; eventName: string; origin: string; slug: string; guestName?: string | null; approved: boolean }) {
  return sendTemplateEmail({
    to: opts.to,
    templateId: opts.approved ? EVENT_TEMPLATES.rsvpApproved : EVENT_TEMPLATES.rsvpDeclined,
    variables: { EVENT_NAME: opts.eventName, EVENT_URL: eventUrl(opts.origin, opts.slug), GUEST_NAME: opts.guestName || 'there' },
  });
}

// Account: nudge a brand-new user to finish their profile / onboarding.
// Fires once at signup; only send when the new account has an email on file.
export function sendCompleteProfile(opts: { to: string; userName?: string | null; origin: string }) {
  return sendTemplateEmail({
    to: opts.to,
    templateId: EVENT_TEMPLATES.completeProfile,
    variables: { USER_NAME: opts.userName || 'there', PROFILE_URL: `${opts.origin}/onboarding` },
  });
}

// Host alert when someone RSVPs / requests to join.
export function sendHostRsvpAlert(opts: { to: string; eventName: string; origin: string; slug: string; guestName?: string | null; pending: boolean }) {
  return sendTemplateEmail({
    to: opts.to,
    templateId: EVENT_TEMPLATES.hostAlert,
    variables: {
      EVENT_NAME: opts.eventName,
      MANAGE_URL: `${opts.origin}/events/${opts.slug}/manage`,
      GUEST_NAME: opts.guestName || 'Someone',
      STATUS: opts.pending ? 'request' : 'rsvp',
    },
  });
}
