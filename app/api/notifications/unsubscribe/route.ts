import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/lib/db';
import { verifyUnsubToken } from '@/lib/notify/unsubscribe';

// GET /api/notifications/unsubscribe?u=<userId>&t=<hmac> — one-click opt-out
// from the DM digest, straight from the email, no login required. The token
// is an HMAC of the user id (lib/notify/unsubscribe.ts); it can only ever
// flip this one boolean off.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get('u') ?? '';
    const token = sp.get('t');
    if (!userId || !verifyUnsubToken(userId, token)) {
      return NextResponse.json({ error: 'Invalid unsubscribe link' }, { status: 400 });
    }

    await db.update(users)
      .set({ dmDigestOptOut: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return new NextResponse(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
      <body style="background:#f5f0e8;font-family:ui-monospace,Menlo,monospace;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0;">
        <div style="max-width:420px;background:#fff;border:1px solid #1a1a1a22;border-radius:12px;padding:28px;text-align:center;">
          <p style="font-size:15px;color:#1a1a1a;font-weight:bold;margin:0 0 8px;">You're unsubscribed ✓</p>
          <p style="font-size:13px;color:#1a1a1acc;margin:0 0 18px;line-height:1.6;">No more unread-message digests. You can turn them back on anytime in your profile settings.</p>
          <a href="/profile" style="display:inline-block;background:#e4fe52;color:#1a1a1a;font-weight:bold;font-size:12px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:10px 18px;border-radius:999px;">Open Topia</a>
        </div>
      </body>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[unsubscribe] failed:', error);
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 });
  }
}
