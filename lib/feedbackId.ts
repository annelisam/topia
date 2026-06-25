import { createHmac } from 'crypto';

// A stable, opaque per-user reference shown on feedback issues. Derived from the
// user id via HMAC so it never leaks the internal/database id, isn't guessable,
// and can't be reversed without the server secret. The admin users list
// recomputes the same value server-side, so a ref on an issue still maps back to
// exactly one person — without that mapping ever leaving the server.
//
// Set FEEDBACK_ID_SECRET for a dedicated key; otherwise it falls back to an
// existing stable server secret so refs are deterministic across instances.
const SECRET =
  process.env.FEEDBACK_ID_SECRET ||
  process.env.PRIVY_APP_SECRET ||
  process.env.DATABASE_URL ||
  'topia-feedback';

export function feedbackRef(userId: string): string {
  const h = createHmac('sha256', SECRET).update(userId).digest('hex');
  return 'U-' + h.slice(0, 12).toUpperCase();
}
