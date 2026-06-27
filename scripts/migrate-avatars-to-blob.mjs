// One-off backfill: move existing base64 avatar data URLs out of the users
// table and into Vercel Blob, storing the public URL instead. Safe to re-run.
//
//   node scripts/migrate-avatars-to-blob.mjs
//
// Safety:
//   1. Backs up every original base64 avatar to a JSON file FIRST.
//   2. Uploads to Blob and HEAD-verifies the URL is reachable BEFORE touching
//      the DB — so a row's base64 is only replaced once the Blob copy exists.
//   3. Per-row error isolation: a failure logs + keeps that row's base64.
//   4. Idempotent: only base64 photo rows are selected; already-migrated
//      (https) rows are skipped, so re-running is harmless.
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN in .env.local — aborting.');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const rows = await sql`
  select id, username, avatar_url from users
  where avatar_url like 'data:image/jpeg%'
     or avatar_url like 'data:image/png%'
     or avatar_url like 'data:image/webp%'`;

console.log(`Found ${rows.length} base64 avatar(s) to migrate.`);
if (rows.length === 0) { console.log('Nothing to do.'); process.exit(0); }

// 1) Back up the originals before changing anything.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/avatar-backup-${stamp}.json`;
writeFileSync(backupPath, JSON.stringify(rows, null, 2));
console.log(`Backed up ${rows.length} originals → ${backupPath}\n`);

let migrated = 0;
const failures = [];
for (const r of rows) {
  try {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(r.avatar_url);
    if (!m) { failures.push({ id: r.id, reason: 'unparseable data URL' }); continue; }
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) { failures.push({ id: r.id, reason: 'empty buffer' }); continue; }

    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const { url } = await put(`avatars/${r.id}.${ext}`, buf, {
      access: 'public', contentType: mime, addRandomSuffix: true,
    });
    if (!url) { failures.push({ id: r.id, reason: 'no url returned from blob' }); continue; }

    // Verify the uploaded blob is reachable before committing the DB change.
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) { failures.push({ id: r.id, reason: `blob HEAD ${head.status}` }); continue; }

    await sql`update users set avatar_url = ${url}, updated_at = now() where id = ${r.id}`;
    migrated++;
    console.log(`  ✓ @${r.username || r.id} → ${url}`);
  } catch (e) {
    failures.push({ id: r.id, reason: e.message });
    console.error(`  ✗ ${r.id}: ${e.message}`);
  }
}

console.log(`\nMigrated ${migrated}/${rows.length}. Failures: ${failures.length}`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
console.log(`Originals backed up at ${backupPath} (restore source if ever needed).`);
