import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const {
      privyId, email, phone, walletAddress,
      name, username, bio, avatarUrl,
      socialWebsite, socialTwitter, socialInstagram,
      roleTags, toolSlugs,
    } = await request.json();

    if (!privyId) {
      return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });
    }

    // Fetch existing user using only guaranteed-to-exist core columns
    const existing = await db
      .select({
        id:              users.id,
        privyId:         users.privyId,
        email:           users.email,
        phone:           users.phone,
        walletAddress:   users.walletAddress,
        name:            users.name,
        username:        users.username,
        bio:             users.bio,
        avatarUrl:       users.avatarUrl,
        socialWebsite:   users.socialWebsite,
        socialTwitter:   users.socialTwitter,
        socialInstagram: users.socialInstagram,
        role:            users.role,
        createdAt:       users.createdAt,
        updatedAt:       users.updatedAt,
      })
      .from(users)
      .where(eq(users.privyId, privyId))
      .limit(1);

    if (existing.length > 0) {
      // Pass 1: always save core fields
      const updated = await db
        .update(users)
        .set({
          email:           email           ?? existing[0].email,
          phone:           phone           ?? existing[0].phone,
          walletAddress:   walletAddress   ?? existing[0].walletAddress,
          name:            name            !== undefined ? name            : existing[0].name,
          username:        username        !== undefined ? username        : existing[0].username,
          bio:             bio             !== undefined ? bio             : existing[0].bio,
          avatarUrl:       avatarUrl       !== undefined ? avatarUrl       : existing[0].avatarUrl,
          socialWebsite:   socialWebsite   !== undefined ? socialWebsite   : existing[0].socialWebsite,
          socialTwitter:   socialTwitter   !== undefined ? socialTwitter   : existing[0].socialTwitter,
          socialInstagram: socialInstagram !== undefined ? socialInstagram : existing[0].socialInstagram,
          updatedAt: new Date(),
        })
        .where(eq(users.privyId, privyId))
        .returning();

      // Pass 2: save new fields — silently skips if DB migration hasn't run yet
      if (roleTags !== undefined || toolSlugs !== undefined) {
        try {
          await db
            .update(users)
            .set({
              ...(roleTags  !== undefined && { roleTags }),
              ...(toolSlugs !== undefined && { toolSlugs }),
            })
            .where(eq(users.privyId, privyId));
        } catch {
          // Columns not in DB yet — run POST /api/migrate to apply the migration
        }
      }

      return NextResponse.json({ user: updated[0] });
    }

    // First-time user — insert core fields
    const newUser = await db
      .insert(users)
      .values({
        privyId,
        email:           email           ?? null,
        phone:           phone           ?? null,
        walletAddress:   walletAddress   ?? null,
        name:            name            ?? null,
        username:        username        ?? null,
        bio:             bio             ?? null,
        avatarUrl:       avatarUrl       ?? null,
        socialWebsite:   socialWebsite   ?? null,
        socialTwitter:   socialTwitter   ?? null,
        socialInstagram: socialInstagram ?? null,
      })
      .returning();

    // Try to add new fields immediately after insert
    if ((roleTags !== undefined || toolSlugs !== undefined) && newUser[0]) {
      try {
        await db
          .update(users)
          .set({
            ...(roleTags  !== undefined && { roleTags }),
            ...(toolSlugs !== undefined && { toolSlugs }),
          })
          .where(eq(users.privyId, privyId));
      } catch {
        // Columns not in DB yet — run POST /api/migrate to apply the migration
      }
    }

    return NextResponse.json({ user: newUser[0] });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
