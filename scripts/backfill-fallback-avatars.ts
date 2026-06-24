import { config } from 'dotenv';
config({ path: '.env.local' });

import { db, users } from '../lib/db';
import { eq, isNotNull } from 'drizzle-orm';
import { fallbackAvatarDataUrl, isRealPhoto } from '../lib/avatar';

// Give every user who claimed a handle but never uploaded a real photo a
// deterministic automated avatar. Users with a real uploaded photo are left
// untouched; users who already have an auto (SVG) avatar are skipped.
//
//   npx tsx scripts/backfill-fallback-avatars.ts
async function main() {
  const rows = await db
    .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, privyId: users.privyId })
    .from(users)
    .where(isNotNull(users.username));

  let updated = 0;
  let skipped = 0;
  for (const u of rows) {
    if (isRealPhoto(u.avatarUrl)) { skipped++; continue; }                       // real photo — leave it
    if (u.avatarUrl && u.avatarUrl.startsWith('data:image/svg')) { skipped++; continue; } // already automated
    const pic = fallbackAvatarDataUrl(u.name, u.privyId || u.username || u.id);
    await db.update(users).set({ avatarUrl: pic, updatedAt: new Date() }).where(eq(users.id, u.id));
    updated++;
  }

  console.log(`✓ backfilled ${updated} automated avatars · skipped ${skipped} (real photo or already automated)`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
