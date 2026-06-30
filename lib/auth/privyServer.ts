import { PrivyClient } from '@privy-io/server-auth';

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

export type PrivyIdentityResult =
  | { configured: false }
  | { configured: true; ok: false }
  | { configured: true; ok: true; did: string; verifiedEmails: string[]; verifiedPhones: string[] };

export async function verifyPrivyIdentity(accessToken: string | null | undefined): Promise<PrivyIdentityResult> {
  const c = getClient();
  if (!c) {
    console.error('[admin-auth] Privy client not configured — missing NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET');
    return { configured: false };
  }
  if (!accessToken) {
    console.error('[admin-auth] No access token provided');
    return { configured: true, ok: false };
  }
  try {
    const claims = await c.verifyAuthToken(accessToken);
    const user = await c.getUser(claims.userId);
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    if (user.email?.address) emailSet.add(user.email.address.toLowerCase());
    if (user.phone?.number) phoneSet.add(user.phone.number);
    for (const acct of user.linkedAccounts) {
      if (acct.type === 'email' && acct.address) emailSet.add(acct.address.toLowerCase());
      else if (acct.type === 'google_oauth' && acct.email) emailSet.add(acct.email.toLowerCase());
      else if (acct.type === 'phone' && acct.number) phoneSet.add(acct.number);
    }
    console.log('[admin-auth] Verified identity:', claims.userId, 'emails:', [...emailSet], 'phones:', [...phoneSet]);
    return { configured: true, ok: true, did: claims.userId, verifiedEmails: [...emailSet], verifiedPhones: [...phoneSet] };
  } catch (err) {
    console.error('[admin-auth] Token verification failed:', err);
    return { configured: true, ok: false };
  }
}
