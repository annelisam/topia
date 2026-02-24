import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Normalize a profile string field: trim whitespace, convert empty to null.
// Returns undefined if the key was not present in the body (meaning "don't update").
function norm(body: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in body)) return undefined;        // key not sent → don't touch
  const v = body[key];
  if (typeof v !== 'string') return null;       // null / wrong type → clear
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;   // empty string → null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const privyId = body.privyId;

    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
    }

    const email         = body.email;
    const phone         = body.phone;
    const walletAddress = body.walletAddress;

    // Profile fields — only updated when explicitly included in request body
    const name              = norm(body, 'name');
    const username          = norm(body, 'username');
    const bio               = norm(body, 'bio');
    const avatarUrl         = norm(body, 'avatarUrl');
    const socialWebsite     = norm(body, 'socialWebsite');
    const socialTwitter     = norm(body, 'socialTwitter');
    const socialInstagram   = norm(body, 'socialInstagram');
    const socialSoundcloud  = norm(body, 'socialSoundcloud');
    const socialSpotify     = norm(body, 'socialSpotify');
    const socialLinkedin    = norm(body, 'socialLinkedin');
    const socialSubstack    = norm(body, 'socialSubstack');
    const roleTags          = 'roleTags'  in body ? body.roleTags  : undefined;
    const toolSlugs         = 'toolSlugs' in body ? body.toolSlugs : undefined;

    // Fetch existing user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      const updated = await db
        .update(users)
        .set({
          email:            email           ?? prev.email,
          phone:            phone           ?? prev.phone,
          walletAddress:    walletAddress   ?? prev.walletAddress,
          name:             name            !== undefined ? name            : prev.name,
          username:         username        !== undefined ? username        : prev.username,
          bio:              bio             !== undefined ? bio             : prev.bio,
          avatarUrl:        avatarUrl       !== undefined ? avatarUrl       : prev.avatarUrl,
          socialWebsite:    socialWebsite   !== undefined ? socialWebsite   : prev.socialWebsite,
          socialTwitter:    socialTwitter   !== undefined ? socialTwitter   : prev.socialTwitter,
          socialInstagram:  socialInstagram !== undefined ? socialInstagram : prev.socialInstagram,
          socialSoundcloud: socialSoundcloud !== undefined ? socialSoundcloud : prev.socialSoundcloud,
          socialSpotify:    socialSpotify   !== undefined ? socialSpotify   : prev.socialSpotify,
          socialLinkedin:   socialLinkedin  !== undefined ? socialLinkedin  : prev.socialLinkedin,
          socialSubstack:   socialSubstack  !== undefined ? socialSubstack  : prev.socialSubstack,
          ...(roleTags  !== undefined && { roleTags }),
          ...(toolSlugs !== undefined && { toolSlugs }),
          updatedAt: new Date(),
        })
        .where(eq(users.privyId, privyId))
        .returning();

      return NextResponse.json({ user: updated[0] });
    }

    // First-time user — insert
    const newUser = await db
      .insert(users)
      .values({
        privyId,
        email:            email           ?? null,
        phone:            phone           ?? null,
        walletAddress:    walletAddress   ?? null,
        name:             name            ?? null,
        username:         username        ?? null,
        bio:              bio             ?? null,
        avatarUrl:        avatarUrl       ?? null,
        socialWebsite:    socialWebsite   ?? null,
        socialTwitter:    socialTwitter   ?? null,
        socialInstagram:  socialInstagram ?? null,
        socialSoundcloud: socialSoundcloud ?? null,
        socialSpotify:    socialSpotify   ?? null,
        socialLinkedin:   socialLinkedin  ?? null,
        socialSubstack:   socialSubstack  ?? null,
        roleTags:         roleTags        ?? null,
        toolSlugs:        toolSlugs       ?? null,
      })
      .returning();

    return NextResponse.json({ user: newUser[0] });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
