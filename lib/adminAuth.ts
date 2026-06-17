// Verifies the signed `topia_admin` cookie set by /api/admin/auth. Mirrors the
// signing there: token = base64("admin:<ts>.<hmacSHA256(payload, SECRET)>").
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'topia_admin';
const SECRET = process.env.ADMIN_COOKIE_SECRET || 'topia-admin-secret-fallback';
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // matches the cookie's 24h maxAge

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

export function isAdminRequest(request: Request): boolean {
  const token = readCookie(request.headers.get('cookie'), COOKIE_NAME);
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8'); // admin:<ts>.<sig>
    const dot = decoded.lastIndexOf('.');
    if (dot === -1) return false;
    const payload = decoded.slice(0, dot);
    const sig = decoded.slice(dot + 1);

    const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const ts = Number(payload.split(':')[1]);
    if (!Number.isFinite(ts) || Date.now() - ts > MAX_AGE_MS) return false;
    return true;
  } catch {
    return false;
  }
}
