import { NextResponse, NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_PASSWORD = 'worldbuilder';
const COOKIE_NAME = 'topia_admin';
const SECRET = process.env.ADMIN_COOKIE_SECRET || 'topia-admin-secret-fallback';

// ─── Token helpers (Node runtime — proxy runs in nodejs, not Edge) ───────────

function verifyToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/auth';

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Login page is public
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token || !verifyToken(token)) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
