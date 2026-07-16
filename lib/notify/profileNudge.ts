// The "finish your passport" safety-net email — for people who signed up
// (Privy auth worked, a users row exists) but never picked a username, which
// leaves them invisible on Topia: no guest-list entry, no DM search, no
// profile URL. One email per user EVER (profile_nudge_sent_at ledger), sent
// 24h+ after signup so it never races an in-progress onboarding, and only to
// accounts created in the last 45 days (first enablement shouldn't mass-mail
// ancient dormant rows).
//
// Master kill switch: PROFILE_NUDGE_ENABLED must be '1' or the sweep no-ops
// with a logged reason.
import { and, gte, isNull, isNotNull, lte } from 'drizzle-orm';
import { db, users } from '@/lib/db';
import { sendBulkEmails } from './email';
import { inArray } from 'drizzle-orm';

const MIN_AGE_MS = 24 * 60 * 60 * 1000;      // let onboarding finish first
const MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000; // don't resurrect ancient rows

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nudgeHtml(opts: { name: string | null; origin: string }): string {
  return `
  <div style="background:#f5f0e8;padding:32px 16px;font-family:ui-monospace,Menlo,monospace;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #1a1a1a22;border-radius:12px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:18px 24px;">
        <span style="color:#e4fe52;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Topia · Passport</span>
      </div>
      <div style="padding:24px;">
        <p style="font-size:15px;color:#1a1a1a;margin:0 0 12px;">
          ${opts.name ? `Hey ${esc(opts.name)} — ` : 'Hey — '}your Topia account exists, but your <b>passport isn't stamped yet</b>.
        </p>
        <p style="font-size:13px;color:#1a1a1acc;margin:0 0 16px;line-height:1.6;">
          Without a handle, people you meet can't find you — you won't show up in guest lists or messages.
          It takes about a minute: pick a name, a handle, a photo.
        </p>
        <a href="${opts.origin}/onboarding"
           style="display:inline-block;background:#e4fe52;color:#1a1a1a;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:12px 22px;border-radius:999px;">
          Finish my passport →
        </a>
        <p style="font-size:11px;color:#1a1a1a80;margin:20px 0 0;">
          This is the only reminder we'll send about this.
        </p>
      </div>
    </div>
  </div>`;
}

export async function sendProfileNudges(origin: string) {
  if (process.env.PROFILE_NUDGE_ENABLED !== '1') {
    console.log('[profile-nudge] PROFILE_NUDGE_ENABLED != 1 — sweep skipped, no emails sent');
    return { enabled: false, candidates: 0, sent: 0, failed: 0 };
  }

  const now = Date.now();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(
      isNull(users.username),
      isNull(users.profileNudgeSentAt),
      isNotNull(users.email),
      lte(users.createdAt, new Date(now - MIN_AGE_MS)),
      gte(users.createdAt, new Date(now - MAX_AGE_MS)),
    ));
  if (rows.length === 0) return { enabled: true, candidates: 0, sent: 0, failed: 0 };

  const emails = rows.map((u) => ({
    to: u.email!,
    subject: 'Your Topia passport is one minute from done',
    html: nudgeHtml({ name: u.name, origin }),
  }));
  const result = await sendBulkEmails(emails);

  // Mark the whole batch attempted — a failed provider call shouldn't queue
  // users up for a second "only reminder" on the next sweep.
  await db.update(users)
    .set({ profileNudgeSentAt: new Date(), updatedAt: new Date() })
    .where(inArray(users.id, rows.map((r) => r.id)));

  console.log(`[profile-nudge] candidates=${rows.length} sent=${result.sent} failed=${result.failed}`);
  return { enabled: true, candidates: rows.length, sent: result.sent, failed: result.failed };
}
