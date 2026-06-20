import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ensureShortLink } from '@/lib/shortlinkStore';

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
    const socialFarcaster   = norm(body, 'socialFarcaster');
    const pronouns          = norm(body, 'pronouns');
    // customLinks is structured (array of {label, url}); pass through if present
    const customLinks       = 'customLinks' in body ? body.customLinks : undefined;
    const roleTags          = 'roleTags'  in body ? body.roleTags  : undefined;
    const toolSlugs         = 'toolSlugs' in body ? body.toolSlugs : undefined;
    const path              = norm(body, 'path');

    // verifyProvider / unverifyProvider: atomically add/remove a provider from
    // the verifiedProviders CSV without the client needing to read-modify-write.
    const verifyProvider:   string | undefined = typeof body.verifyProvider   === 'string' ? body.verifyProvider.trim().toLowerCase()   : undefined;
    const unverifyProvider: string | undefined = typeof body.unverifyProvider === 'string' ? body.unverifyProvider.trim().toLowerCase() : undefined;

    // Fetch existing user
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    function nextVerifiedProviders(prev: string | null): string | null {
      const set = new Set((prev ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
      if (verifyProvider)   set.add(verifyProvider);
      if (unverifyProvider) set.delete(unverifyProvider);
      const joined = [...set].join(',');
      return joined || null;
    }

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
          socialFarcaster:  socialFarcaster !== undefined ? socialFarcaster : prev.socialFarcaster,
          pronouns:         pronouns        !== undefined ? pronouns        : prev.pronouns,
          ...(customLinks !== undefined && { customLinks }),
          ...(roleTags  !== undefined && { roleTags }),
          ...(toolSlugs !== undefined && { toolSlugs }),
          path:             path            !== undefined ? path            : prev.path,
          ...((verifyProvider || unverifyProvider) && { verifiedProviders: nextVerifiedProviders(prev.verifiedProviders) }),
          updatedAt: new Date(),
        })
        .where(eq(users.privyId, privyId))
        .returning();

      // Generate the profile short link the first time a username is set
      // (deduped, so re-saves are cheap no-ops).
      if (username !== undefined && updated[0].username) {
        try { await ensureShortLink({ path: `/profile/${updated[0].username}`, kind: 'profile', createdBy: updated[0].id }); } catch { /* ignore */ }
      }

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
        socialFarcaster:  socialFarcaster ?? null,
        pronouns:         pronouns        ?? null,
        customLinks:      customLinks     ?? null,
        roleTags:         roleTags        ?? null,
        toolSlugs:        toolSlugs       ?? null,
        path:             path            ?? null,
        verifiedProviders: nextVerifiedProviders(null),
      })
      .returning();

    if (newUser[0].username) {
      try { await ensureShortLink({ path: `/profile/${newUser[0].username}`, kind: 'profile', createdBy: newUser[0].id }); } catch { /* ignore */ }
    }

    return NextResponse.json({ user: newUser[0] });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
