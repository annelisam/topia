import { NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminAuth';

// POST /api/admin/auth — verify that the caller's Privy token belongs to an
// approved admin email. Returns { ok, emails } on success, 403 otherwise.
export async function POST(request: Request) {
  const { accessToken } = await request.json();
  const result = await verifyAdminToken(accessToken);
  if (!result.ok) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, emails: result.emails });
}
