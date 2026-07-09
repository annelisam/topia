import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { resolveConnectCode } from '@/lib/connect/code';

// /connect/<code> — where a personal QR lands when scanned with a plain
// camera app (the in-app scanner intercepts the code before navigation).
// For now it redirects to the person's profile; P3 turns this into a proper
// connect page (one-tap mutual follow + "met at" context).
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const userId = await resolveConnectCode(token.toUpperCase());
    if (userId) {
      const [u] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
      if (u?.username) return NextResponse.redirect(new URL(`/profile/${u.username}`, request.url));
    }
  } catch (error) {
    console.error('[connect] token resolve failed:', error);
  }
  return NextResponse.redirect(new URL('/', request.url));
}
