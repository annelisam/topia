import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { worldEras, eraProcessPosts, inProcessAccounts, worldMembers, users } from '@/lib/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured, decryptApiKey, mintMoment } from '@/lib/inProcessAccount';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const BUILDER_ROLES = ['owner', 'world_builder'];
const POST_KINDS = new Set(['moment', 'thought', 'link', 'embed']);

function cleanUrl(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return /^https?:$/.test(u.protocol) ? u.toString().slice(0, 2000) : null;
  } catch {
    return null;
  }
}

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
    const { privyId, eraId, kind, title, body, imageUrl, linkUrl, mintToInProcess, accessToken } = await request.json();
    const cleanKind = String(kind || 'moment');
    if (!POST_KINDS.has(cleanKind)) {
      return NextResponse.json({ error: 'kind must be moment, thought, link, or embed' }, { status: 400 });
    }
    const cleanLink = cleanUrl(linkUrl);
    if ((cleanKind === 'link' || cleanKind === 'embed') && !cleanLink) {
      return NextResponse.json({ error: 'A valid URL is required for a link or embed' }, { status: 400 });
    }
    // Links can auto-title from their host; everything else needs words.
    const cleanTitle = String(title ?? '').trim() || (cleanLink ? new URL(cleanLink).hostname.replace(/^www\./, '') : '');
    if (!privyId || !eraId || !cleanTitle) {
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
          // Link/embed posts mint as writing moments carrying the URL.
          const mintText = [body ? String(body).trim() : '', cleanLink ?? ''].filter(Boolean).join('\n') || null;
          const result = await mintMoment({
            apiKey,
            artistAddress: account.artistAddress,
            title: cleanTitle.slice(0, 200),
            text: mintText?.slice(0, 4000) ?? null,
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
      kind: cleanKind,
      title: cleanTitle.slice(0, 200),
      body: body ? String(body).trim().slice(0, 4000) : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
      linkUrl: cleanLink,
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
