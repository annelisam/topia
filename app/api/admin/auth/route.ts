import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const COOKIE_NAME = 'topia_admin';
const ADMIN_PASSWORD = 'worldbuilder';
const SECRET = process.env.ADMIN_COOKIE_SECRET || 'topia-admin-secret-fallback';

function validatePassword(pw: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(pw);
  const b = enc.encode(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function signToken(): string {
  const payload = `admin:${Date.now()}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64');
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return res;
  }

  // Login
  if (!body.password || !validatePassword(body.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = signToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return res;
}
