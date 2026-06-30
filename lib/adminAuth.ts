import { verifyPrivyIdentity } from '@/lib/auth/privyServer';

const ADMIN_EMAILS = new Set([
  'annelisamm@icloud.com',
  'annelisamm@gmail.com',
  'contact@callmelatasha.com',
  'latasha@topia.vision',
  'jada@topia.vision',
  'jahmel@byjahart.com',
  'jahmel@topia.vision',
  'dae@callmelatasha.com',
].map(e => e.toLowerCase()));

const ADMIN_PHONES = new Set([
  '+19166477856',
]);

function isAllowed(identity: { verifiedEmails: string[]; verifiedPhones: string[] }): boolean {
  return identity.verifiedEmails.some(e => ADMIN_EMAILS.has(e))
    || identity.verifiedPhones.some(p => ADMIN_PHONES.has(p));
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;

  const result = await verifyPrivyIdentity(token);
  if (!result.configured || !result.ok) return false;

  return isAllowed(result);
}

export async function verifyAdminToken(accessToken: string | null | undefined): Promise<
  | { ok: false }
  | { ok: true; did: string; emails: string[] }
> {
  const result = await verifyPrivyIdentity(accessToken);
  if (!result.configured) {
    console.error('[admin-auth] Privy not configured');
    return { ok: false };
  }
  if (!result.ok) {
    console.error('[admin-auth] Token verification returned ok:false');
    return { ok: false };
  }
  if (!isAllowed(result)) {
    console.error('[admin-auth] User not in allowlist. Emails:', result.verifiedEmails, 'Phones:', result.verifiedPhones);
    return { ok: false };
  }
  return { ok: true, did: result.did, emails: result.verifiedEmails };
}
