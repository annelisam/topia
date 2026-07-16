// Daily DM digest — one "essential info" email per user summarizing unread
// messages by sender ("3 from Latasha, 1 from Jada"), never one email per DM.
//
// Anti-nag rules:
//   - A user is only emailed when they have unread messages AND at least one
//     of them arrived in the last 24h. Stale unreads don't re-trigger daily
//     emails — no new activity, no email. This self-regulates better than a
//     fixed every-other-day cadence.
//   - Only 'accepted' (Primary) conversations count — message Requests from
//     strangers never generate email.
//   - Master kill switch: DM_DIGEST_ENABLED must be '1' or the sweep no-ops
//     with a logged reason (the graceful-degradation house pattern).
import { and, eq, gt, inArray, isNull, ne, or } from 'drizzle-orm';
import { db, users, conversationMembers, messages } from '@/lib/db';
import { sendBulkEmails } from './email';
import { unsubUrl } from './unsubscribe';

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_SENDERS_LISTED = 6;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function digestHtml(opts: { name: string | null; lines: string[]; total: number; origin: string; unsubscribe: string | null }): string {
  const rows = opts.lines.map((l) => `<tr><td style="padding:4px 0;font-size:14px;color:#1a1a1a;">${l}</td></tr>`).join('');
  const optOutLine = opts.unsubscribe
    ? `<a href="${opts.unsubscribe}" style="color:#1a1a1a80;">Unsubscribe from these</a>`
    : 'Turn these off anytime in your profile settings.';
  return `
  <div style="background:#f5f0e8;padding:32px 16px;font-family:ui-monospace,Menlo,monospace;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #1a1a1a22;border-radius:12px;overflow:hidden;">
      <div style="background:#1a1a1a;padding:18px 24px;">
        <span style="color:#e4fe52;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Topia · Messages</span>
      </div>
      <div style="padding:24px;">
        <p style="font-size:15px;color:#1a1a1a;margin:0 0 12px;">
          ${opts.name ? `Hey ${esc(opts.name)} — ` : ''}you have <b>${opts.total} unread message${opts.total === 1 ? '' : 's'}</b> waiting:
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows}</table>
        <a href="${opts.origin}/messages"
           style="display:inline-block;background:#e4fe52;color:#1a1a1a;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:12px 22px;border-radius:999px;">
          Open messages →
        </a>
        <p style="font-size:11px;color:#1a1a1a80;margin:20px 0 0;">
          You get at most one of these a day, and only when something new arrived. ${optOutLine}
        </p>
      </div>
    </div>
  </div>`;
}

export async function sendDmDigests(origin: string) {
  if (process.env.DM_DIGEST_ENABLED !== '1') {
    console.log('[dm-digest] DM_DIGEST_ENABLED != 1 — sweep skipped, no emails sent');
    return { enabled: false, recipients: 0, sent: 0, failed: 0 };
  }

  // Every unread message in an accepted membership, with its recipient.
  const rows = await db
    .select({
      recipientId: conversationMembers.userId,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
    })
    .from(conversationMembers)
    .innerJoin(messages, eq(messages.conversationId, conversationMembers.conversationId))
    .where(and(
      eq(conversationMembers.status, 'accepted'),
      ne(messages.senderId, conversationMembers.userId),
      or(isNull(conversationMembers.lastReadAt), gt(messages.createdAt, conversationMembers.lastReadAt)),
    ));

  // recipient → sender → unread count, plus whether anything is fresh (24h).
  const freshCutoff = Date.now() - FRESH_WINDOW_MS;
  const byRecipient = new Map<string, { bySender: Map<string, number>; fresh: boolean; total: number }>();
  for (const r of rows) {
    let entry = byRecipient.get(r.recipientId);
    if (!entry) { entry = { bySender: new Map(), fresh: false, total: 0 }; byRecipient.set(r.recipientId, entry); }
    entry.bySender.set(r.senderId, (entry.bySender.get(r.senderId) ?? 0) + 1);
    entry.total += 1;
    if (new Date(r.createdAt).getTime() >= freshCutoff) entry.fresh = true;
  }

  const recipients = [...byRecipient.entries()].filter(([, e]) => e.fresh);
  if (recipients.length === 0) return { enabled: true, recipients: 0, sent: 0, failed: 0 };

  // Profile bits for recipients (need email) + senders (need display name).
  const userIds = new Set<string>();
  for (const [rid, e] of recipients) { userIds.add(rid); for (const sid of e.bySender.keys()) userIds.add(sid); }
  const people = await db
    .select({ id: users.id, name: users.name, username: users.username, email: users.email, dmDigestOptOut: users.dmDigestOptOut })
    .from(users)
    .where(inArray(users.id, [...userIds]));
  const byId = new Map(people.map((p) => [p.id, p]));

  const emails = recipients.flatMap(([recipientId, entry]) => {
    const me = byId.get(recipientId);
    if (!me?.email || me.dmDigestOptOut) return [];
    const senders = [...entry.bySender.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sid, n]) => ({ who: byId.get(sid), n }));
    const lines = senders.slice(0, MAX_SENDERS_LISTED).map(({ who, n }) =>
      `<b>${n}</b> from ${esc(who?.name || (who?.username ? `@${who.username}` : 'someone on Topia'))}`);
    if (senders.length > MAX_SENDERS_LISTED) {
      lines.push(`…and more from ${senders.length - MAX_SENDERS_LISTED} other ${senders.length - MAX_SENDERS_LISTED === 1 ? 'person' : 'people'}`);
    }
    return [{
      to: me.email,
      subject: `${entry.total} unread message${entry.total === 1 ? '' : 's'} on Topia`,
      html: digestHtml({ name: me.name, lines, total: entry.total, origin, unsubscribe: unsubUrl(origin, me.id) }),
    }];
  });

  const result = await sendBulkEmails(emails);
  console.log(`[dm-digest] recipients=${emails.length} sent=${result.sent} failed=${result.failed}`);
  return { enabled: true, recipients: emails.length, sent: result.sent, failed: result.failed };
}
