import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyPrivyEmails } from '@/lib/auth/privyServer';

// In-app feedback → GitHub issue. Logged-in only. Each issue is tagged so the
// team can distinguish user-submitted feedback: a 'user-feedback' label, a
// per-category label, a title prefix, and the submitter's handle in the body.
//
// Setup: create a fine-grained PAT scoped to the repo with Issues: read+write
// and set GITHUB_FEEDBACK_TOKEN (and optionally GITHUB_FEEDBACK_REPO, defaults
// to annelisam/topia).

const REPO = process.env.GITHUB_FEEDBACK_REPO || 'annelisam/topia';
const TOKEN = process.env.GITHUB_FEEDBACK_TOKEN;

const CATEGORIES: Record<string, { prefix: string; labels: string[] }> = {
  bug:   { prefix: '[Bug]',      labels: ['user-feedback', 'bug'] },
  idea:  { prefix: '[Idea]',     labels: ['user-feedback', 'enhancement'] },
  other: { prefix: '[Feedback]', labels: ['user-feedback'] },
};

export async function POST(request: NextRequest) {
  try {
    if (!TOKEN) return NextResponse.json({ error: 'Feedback isn’t set up yet — missing GITHUB_FEEDBACK_TOKEN.' }, { status: 503 });

    const { privyId, accessToken, category, message, url, userAgent, viewport } = await request.json() as {
      privyId?: string; accessToken?: string; category?: string; message?: string; url?: string; userAgent?: string; viewport?: string;
    };

    if (!privyId) return NextResponse.json({ error: 'Sign in to send feedback.' }, { status: 401 });
    if (!message || !message.trim()) return NextResponse.json({ error: 'Please add a description.' }, { status: 400 });

    // Verify the session when Privy server-auth is configured (anti-spoof);
    // otherwise fall back to the supplied privyId (display attribution only).
    const verification = await verifyPrivyEmails(accessToken);
    if (verification.configured && !verification.ok) {
      return NextResponse.json({ error: 'Couldn’t verify your session — reload and try again.' }, { status: 401 });
    }
    const did = verification.configured && verification.ok ? verification.did : privyId;

    const [u] = await db
      .select({ name: users.name, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.privyId, did))
      .limit(1);

    const cat = CATEGORIES[category ?? 'other'] ?? CATEGORIES.other;
    const handle = u?.username ? `@${u.username}` : (u?.name || 'unknown user');
    const firstLine = message.trim().split('\n')[0].slice(0, 80);
    const title = `${cat.prefix} ${firstLine}`;

    const body = [
      message.trim(),
      '',
      '---',
      `**From:** ${handle}${u?.email ? ` · ${u.email}` : ''}`,
      `**Category:** ${category ?? 'other'}`,
      url ? `**Page:** \`${url}\`` : '',
      viewport ? `**Viewport:** ${viewport}` : '',
      userAgent ? `**Browser:** ${userAgent}` : '',
      `**User ID:** \`${did}\``,
      '',
      '_Submitted via the in-app feedback widget._',
    ].filter(Boolean).join('\n');

    const [owner, repo] = REPO.split('/');
    const ghHeaders = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };

    // Best-effort: ensure the 'user-feedback' label exists (422 = already there).
    await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({ name: 'user-feedback', color: 'e4fe52', description: 'Submitted via the in-app feedback widget' }),
    }).catch(() => {});

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({ title, body, labels: cat.labels }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Feedback → GitHub issue failed:', res.status, detail);
      return NextResponse.json({ error: 'Couldn’t submit feedback right now — please try again later.' }, { status: 502 });
    }

    const issue = await res.json();
    return NextResponse.json({ ok: true, url: issue.html_url, number: issue.number });
  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
