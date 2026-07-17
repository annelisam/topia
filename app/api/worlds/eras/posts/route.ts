import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldEras, eraProcessPosts, inProcessAccounts, worldMembers, users } from '@/lib/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured, decryptApiKey, mintMoment } from '@/lib/inProcessAccount';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const BUILDER_ROLES = ['owner', 'world_builder'];

async function authorizeEra(privyId: string, eraId: string) {
  const [era] = await db.select({ id: worldEras.id, worldId: worldEras.worldId, inProcessUrl: worldEras.inProcessUrl })
    .from(worldEras).where(eq(worldEras.id, eraId)).limit(1);
  if (!era) return { error: 'Era not found', status: 404 } as const;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId)).limit(1);
  if (!user) return { error: 'Not authorized', status: 403 } as const;
  const [membership] = await db.select({ id: worldMembers.id }).from(worldMembers)
    .where(and(
      eq(worldMembers.worldId, era.worldId),
      eq(worldMembers.userId, user.id),
      inArray(worldMembers.role, BUILDER_ROLES),
    )).limit(1);
  if (!membership) return { error: 'Not authorized', status: 403 } as const;
  return { era, userId: user.id } as const;
}

// POST /api/worlds/eras/posts — { privyId, eraId, title, body?, imageUrl?,
// mintToInProcess?, accessToken? }
// A native Topia process-log post (builders). Topia-first: the post always
// lands here; when mintToInProcess is set AND the author has a connected
// account, the same content is minted as a moment (bearer-verified, since
// that spends the author's In Process identity). A failed mint never loses
// the post — it saves with a warning instead.
export async function POST(request: Request) {
  try {
    const { privyId, eraId, title, body, imageUrl, mintToInProcess, accessToken } = await request.json();
    if (!privyId || !eraId || !title?.trim()) {
      return NextResponse.json({ error: 'eraId and title are required' }, { status: 400 });
    }
    const auth = await authorizeEra(privyId, eraId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let mintedUrl: string | null = null;
    let mintWarning: string | null = null;

    if (mintToInProcess) {
      if (!isInProcessWriteConfigured()) {
        mintWarning = 'In Process minting is not configured on this server';
      } else {
        const identity = await verifyPrivyIdentity(accessToken);
        // Identity only gates the MINT (it spends the author's In Process
        // key) — the native post is already builder-authorized above, so a
        // failed bearer degrades to posting without minting, never a 401
        // that eats the post.
        const identityOk = !identity.configured || (identity.ok && identity.did === privyId);
        if (!identity.configured) console.warn('[era-posts] PRIVY_APP_SECRET unset — mint not token-verified');
        if (!identityOk) {
          mintWarning = 'Posted on Topia — couldn’t verify your session for minting, try the ⛓ again';
        } else {
        const [account] = await db.select().from(inProcessAccounts)
          .where(eq(inProcessAccounts.userId, auth.userId)).limit(1);
        const apiKey = account ? decryptApiKey(account.apiKeyEncrypted) : null;
        if (!account || !apiKey) {
          mintWarning = 'Posted on Topia — connect In Process in your profile to mint moments';
        } else {
          const result = await mintMoment({
            apiKey,
            artistAddress: account.artistAddress,
            title: String(title).trim().slice(0, 200),
            text: body ? String(body).trim().slice(0, 4000) : null,
            imageUrl: imageUrl ? String(imageUrl) : null,
          });
          if (result.ok) {
            mintedUrl = result.collectUrl;
            // First mint wires the era's synced timeline if it isn't set.
            if (!auth.era.inProcessUrl) {
              await db.update(worldEras)
                .set({ inProcessUrl: `https://inprocess.world/${account.artistAddress}`, updatedAt: new Date() })
                .where(and(eq(worldEras.id, eraId), isNull(worldEras.inProcessUrl)));
            }
          } else {
            mintWarning = `Posted on Topia, but the In Process mint failed: ${result.reason}`;
          }
        }
        }
      }
    }

    const [post] = await db.insert(eraProcessPosts).values({
      eraId,
      authorUserId: auth.userId,
      title: String(title).trim().slice(0, 200),
      body: body ? String(body).trim().slice(0, 4000) : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      mintedUrl,
    }).returning();

    return NextResponse.json({ post, mintedUrl, mintWarning }, { headers: NO_STORE });
  } catch (error) {
    console.error('[era-posts] POST failed:', error);
    return NextResponse.json({ error: 'Failed to add the post' }, { status: 500 });
  }
}

// DELETE /api/worlds/eras/posts?postId=X&privyId=Y — removes the Topia post
// (an already-minted moment stays on In Process — mints are permanent).
export async function DELETE(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const postId = sp.get('postId');
    const privyId = sp.get('privyId');
    if (!postId || !privyId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    const [post] = await db.select({ eraId: eraProcessPosts.eraId }).from(eraProcessPosts)
      .where(eq(eraProcessPosts.id, postId)).limit(1);
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const auth = await authorizeEra(privyId, post.eraId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await db.delete(eraProcessPosts).where(eq(eraProcessPosts.id, postId));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[era-posts] DELETE failed:', error);
    return NextResponse.json({ error: 'Failed to delete the post' }, { status: 500 });
  }
}
