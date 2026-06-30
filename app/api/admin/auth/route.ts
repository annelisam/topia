import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';

// POST /api/admin/auth — verify that the caller's Privy token belongs to an
// approved admin email. Returns { ok, emails } on success, 403 otherwise.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accessToken } = body;
    if (!accessToken) {
      console.error('[admin-auth] POST /api/admin/auth called without accessToken');
      return NextResponse.json({ error: 'No access token provided' }, { status: 401 });
    }
    const result = await verifyAdminToken(accessToken);
    if (!result.ok) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    return NextResponse.json({ ok: true, emails: result.emails });
  } catch (err) {
    console.error('[admin-auth] Unexpected error in POST /api/admin/auth:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
