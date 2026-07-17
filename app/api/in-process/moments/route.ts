import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, users, inProcessAccounts, worldEras, worldMembers } from '@/lib/db';
import { verifyPrivyIdentity } from '@/lib/auth/privyServer';
import { isInProcessWriteConfigured, decryptApiKey, mintMoment } from '@/lib/inProcessAccount';

// POST /api/in-process/moments — { privyId, accessToken, title, text?,
// imageUrl?, eraId? }
// Mints a moment on the CALLER'S connected In Process timeline (onchain +
// Arweave — permanent, the UI says so). When an eraId is supplied and that
// era has no In Process link yet, the minter's timeline becomes its process
// log, so the moment shows up on the world page within a cache tick.
export async function POST(request: NextRequest) {
  try {
    const { privyId, accessToken, title, text, imageUrl, eraId } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!isInProcessWriteConfigured()) {
      return NextResponse.json({ error: 'In Process connection is not configured on this server' }, { status: 503 });
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.privyId, privyId ?? '')).limit(1);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const identity = await verifyPrivyIdentity(accessToken);
    if (identity.configured && (!identity.ok || identity.did !== privyId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
    if (!identity.configured) console.warn('[in-process] PRIVY_APP_SECRET unset — mint not token-verified');

    const [account] = await db.select().from(inProcessAccounts).where(eq(inProcessAccounts.userId, user.id)).limit(1);
    if (!account) return NextResponse.json({ error: 'Connect your In Process account first' }, { status: 400 });
    const apiKey = decryptApiKey(account.apiKeyEncrypted);
    if (!apiKey) return NextResponse.json({ error: 'Your In Process connection needs to be re-linked' }, { status: 409 });

    const result = await mintMoment({
      apiKey,
      artistAddress: account.artistAddress,
      title: String(title).trim().slice(0, 200),
      text: text ? String(text).trim().slice(0, 4000) : null,
      imageUrl: imageUrl ? String(imageUrl) : null,
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 502 });

    // Wire the era's process log to the minter's timeline if it isn't set —
    // only for eras in worlds where the minter is actually a builder.
    if (eraId) {
      const [era] = await db.select({ id: worldEras.id, worldId: worldEras.worldId, inProcessUrl: worldEras.inProcessUrl })
        .from(worldEras).where(eq(worldEras.id, eraId)).limit(1);
      if (era && !era.inProcessUrl) {
        const [membership] = await db.select({ id: worldMembers.id }).from(worldMembers)
          .where(and(
            eq(worldMembers.worldId, era.worldId),
            eq(worldMembers.userId, user.id),
            inArray(worldMembers.role, ['owner', 'world_builder']),
          )).limit(1);
        if (membership) {
          await db.update(worldEras)
            .set({ inProcessUrl: `https://inprocess.world/${account.artistAddress}`, updatedAt: new Date() })
            .where(and(eq(worldEras.id, era.id), isNull(worldEras.inProcessUrl)));
        }
      }
    }

    return NextResponse.json(
      { ok: true, collectUrl: result.collectUrl, hash: result.hash },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[in-process] mint failed:', error);
    return NextResponse.json({ error: 'Failed to mint the moment' }, { status: 500 });
  }
}
