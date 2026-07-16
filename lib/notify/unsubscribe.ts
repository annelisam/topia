// One-click unsubscribe tokens for notification emails — HMAC of the user id,
// so the email link needs no login and exposes no capability beyond "stop
// emailing this user". Degrades gracefully: with no secret configured,
// callers get null and should link to profile settings instead.
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string | null {
  return process.env.UNSUB_SECRET || process.env.CRON_SECRET || null;
}

export function unsubToken(userId: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac('sha256', s).update(`unsub:${userId}`).digest('hex').slice(0, 32);
}

export function verifyUnsubToken(userId: string, token: string | null): boolean {
  const expect = unsubToken(userId);
  if (!expect || !token) return false;
  const a = Buffer.from(expect);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubUrl(origin: string, userId: string): string | null {
  const t = unsubToken(userId);
  return t ? `${origin}/api/notifications/unsubscribe?u=${encodeURIComponent(userId)}&t=${t}` : null;
}
