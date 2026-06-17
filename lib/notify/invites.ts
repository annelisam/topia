// Pluggable invite delivery. Uses plain fetch (no SDK deps) so it stays dormant
// until you add provider keys, then auto-activates:
//   email → RESEND_API_KEY  (+ optional INVITE_EMAIL_FROM)
//   sms   → TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
// When a channel isn't configured, sendInvite returns { sent:false,
// reason:'not_configured' } and the caller surfaces the shareable link instead.

export type InviteChannel = 'email' | 'sms';

export function isInviteChannelConfigured(channel: InviteChannel): boolean {
  if (channel === 'email') return Boolean(process.env.RESEND_API_KEY);
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export async function sendInvite(opts: {
  channel: InviteChannel;
  to: string;
  eventName: string;
  url: string;
  inviterName?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const { channel, to, eventName, url, inviterName } = opts;
  const lede = inviterName ? `${inviterName} invited you` : "You're invited";

  if (channel === 'email') {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { sent: false, reason: 'not_configured' };
    const from = process.env.INVITE_EMAIL_FROM || 'Topia <onboarding@resend.dev>';
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject: `${lede} to ${eventName}`,
          html: `<p>${lede} to <strong>${eventName}</strong> on Topia.</p><p><a href="${url}">RSVP here →</a></p>`,
        }),
      });
      return res.ok ? { sent: true } : { sent: false, reason: `resend_${res.status}` };
    } catch {
      return { sent: false, reason: 'resend_error' };
    }
  }

  // sms
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !tok || !from) return { sent: false, reason: 'not_configured' };
  try {
    const body = new URLSearchParams({ To: to, From: from, Body: `${lede} to ${eventName} on Topia: ${url}` });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `twilio_${res.status}` };
  } catch {
    return { sent: false, reason: 'twilio_error' };
  }
}
