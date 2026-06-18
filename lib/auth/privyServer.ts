import { PrivyClient } from '@privy-io/server-auth';

// Server-side Privy verification. The client cannot be trusted to report which
// email it "verified" — anyone can POST an arbitrary body — so for actions that
// require a verified email (e.g. RSVP) we confirm it here against Privy itself.
//
// Activation is gated on PRIVY_APP_SECRET: until that secret is set (grab it
// from the Privy dashboard → App settings), this returns { configured: false }
// and callers fall back to a non-enforcing path so existing flows keep working.

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

let client: PrivyClient | null = null;
function getClient(): PrivyClient | null {
  if (!appId || !appSecret) return null;
  if (!client) client = new PrivyClient(appId, appSecret);
  return client;
}

export type PrivyVerification =
  | { configured: false }
  | { configured: true; ok: false }
  | { configured: true; ok: true; did: string; verifiedEmails: string[] };

// Verify a Privy access token and return the authenticated user's verified
// email addresses (from `email` and `google_oauth` linked accounts — every
// linked account in Privy is verified at link time).
export async function verifyPrivyEmails(accessToken: string | null | undefined): Promise<PrivyVerification> {
  const c = getClient();
  if (!c) return { configured: false };
  if (!accessToken) return { configured: true, ok: false };
  try {
    const claims = await c.verifyAuthToken(accessToken);
    const user = await c.getUser(claims.userId);
    const verifiedEmails: string[] = [];
    for (const acct of user.linkedAccounts) {
      if (acct.type === 'email' && acct.address) verifiedEmails.push(acct.address.toLowerCase());
      else if (acct.type === 'google_oauth' && acct.email) verifiedEmails.push(acct.email.toLowerCase());
    }
    return { configured: true, ok: true, did: claims.userId, verifiedEmails };
  } catch {
    return { configured: true, ok: false };
  }
}
