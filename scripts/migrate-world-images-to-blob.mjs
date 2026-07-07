// One-off backfill: move base64 world images (image_url + header_image_url)
// out of the worlds table and into Vercel Blob, storing the public URL
// instead. Mirrors scripts/migrate-avatars-to-blob.mjs. The base64 payloads
// (up to 2.7MB per world, ~7MB across published worlds) were shipping inside
// the server-rendered /worlds HTML.
//
//   node scripts/migrate-world-images-to-blob.mjs
//
// Safety:
//   1. Backs up every original base64 value to a JSON file FIRST.
//   2. Uploads to Blob and HEAD-verifies the URL is reachable BEFORE touching
//      the DB — a row's base64 is only replaced once the Blob copy exists.
//   3. Per-row error isolation: a failure logs + keeps that row's base64.
//   4. Idempotent: only base64 rows are selected; already-migrated (https)
//      rows are skipped, so re-running is harmless.
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

const COLUMNS = ['image_url', 'header_image_url'];

const rows = await sql`
  select id, slug, image_url, header_image_url from worlds
  where image_url like 'data:image%'
     or header_image_url like 'data:image%'`;

console.log(`Found ${rows.length} world(s) with base64 image(s) to migrate.`);
if (rows.length === 0) { console.log('Nothing to do.'); process.exit(0); }

// 1) Back up the originals before changing anything.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `scripts/world-image-backup-${stamp}.json`;
writeFileSync(backupPath, JSON.stringify(rows, null, 2));
console.log(`Backed up ${rows.length} originals → ${backupPath}\n`);

let migrated = 0;
const failures = [];
for (const r of rows) {
  for (const col of COLUMNS) {
    const val = r[col];
    if (!val || !val.startsWith('data:image')) continue;
    try {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/s.exec(val);
      if (!m) { failures.push({ id: r.id, col, reason: 'unparseable data URL' }); continue; }
      const mime = m[1];
      const buf = Buffer.from(m[2], 'base64');
      if (!buf.length) { failures.push({ id: r.id, col, reason: 'empty buffer' }); continue; }

      const ext = mime.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      const { url } = await put(`world-images/${r.slug}-${col}.${ext}`, buf, {
        access: 'public', contentType: mime, addRandomSuffix: true,
      });
      if (!url) { failures.push({ id: r.id, col, reason: 'no url returned from blob' }); continue; }

      // Verify the uploaded blob is reachable before committing the DB change.
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) { failures.push({ id: r.id, col, reason: `blob HEAD ${head.status}` }); continue; }

      if (col === 'image_url') {
        await sql`update worlds set image_url = ${url}, updated_at = now() where id = ${r.id}`;
      } else {
        await sql`update worlds set header_image_url = ${url}, updated_at = now() where id = ${r.id}`;
      }
      migrated++;
      console.log(`  ✓ ${r.slug} ${col} (${Math.round(buf.length / 1024)}KB) → ${url}`);
    } catch (e) {
      failures.push({ id: r.id, col, reason: e.message });
      console.error(`  ✗ ${r.slug} ${col}: ${e.message}`);
    }
  }
}

console.log(`\nMigrated ${migrated} image(s) across ${rows.length} world(s). Failures: ${failures.length}`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
console.log(`Originals backed up at ${backupPath} (restore source if ever needed).`);
