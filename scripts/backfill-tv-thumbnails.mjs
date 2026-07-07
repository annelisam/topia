// Backfill tv_episodes.thumbnail_url for published episodes that have none.
// The /tv player uses thumbnailUrl as the video poster (the page's LCP
// element), so episodes without one paint late.
//
// For each published row with thumbnail_url IS NULL:
//   1. extract a frame from video_url (ffmpeg reads the remote mp4 directly,
//      seeked --ss seconds in) as a 1280w webp
//   2. with --apply: upload to Vercel Blob at tv/thumbs/<slug>.webp
//      (deterministic path + allowOverwrite, so re-runs never orphan files),
//      HEAD-verify the blob, then UPDATE the row
//
// DRY-RUN BY DEFAULT: without --apply it only writes preview frames to
// scripts/.tv-thumbs/ so they can be eyeballed first. Idempotent: only rows
// still NULL are touched, and the UPDATE re-checks thumbnail_url IS NULL.
//
// Usage: node scripts/backfill-tv-thumbnails.mjs [--apply] [--ss <seconds>]
// Needs: DATABASE_URL + BLOB_READ_WRITE_TOKEN (.env.local), and ffmpeg —
// either on PATH or via `npm install --no-save ffmpeg-static`.

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ssIdx = process.argv.indexOf('--ss');
const SEEK_SECONDS = ssIdx > -1 ? Number(process.argv[ssIdx + 1]) : 5;
const OUT_DIR = 'scripts/.tv-thumbs';

function resolveFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch { /* not on PATH */ }
  try {
    return createRequire(import.meta.url)('ffmpeg-static');
  } catch {
    console.error('ffmpeg not found. Run: npm install --no-save ffmpeg-static');
    process.exit(1);
  }
}

const ffmpeg = resolveFfmpeg();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

const { rows } = await pool.query(
  `SELECT slug, title, video_url FROM tv_episodes
   WHERE published = true AND thumbnail_url IS NULL
   ORDER BY slug`,
);
console.log(`${rows.length} published episode(s) missing a thumbnail${APPLY ? '' : ' (dry run — pass --apply to upload + update)'}`);
mkdirSync(OUT_DIR, { recursive: true });

const failures = [];
for (const row of rows) {
  const framePath = `${OUT_DIR}/${row.slug}.webp`;
  try {
    execFileSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(SEEK_SECONDS),
      '-i', row.video_url,
      '-frames:v', '1',
      '-vf', 'scale=1280:-2',
      '-c:v', 'libwebp', '-quality', '82',
      framePath,
    ], { timeout: 120_000 });
    if (!existsSync(framePath)) throw new Error('ffmpeg produced no frame');
    const buf = readFileSync(framePath);
    if (!buf.length) throw new Error('empty frame file');
    console.log(`  ✓ frame ${framePath} (${Math.round(buf.length / 1024)} KiB) — ${row.title}`);

    if (!APPLY) continue;

    const { url } = await put(`tv/thumbs/${row.slug}.webp`, buf, {
      access: 'public', contentType: 'image/webp',
      addRandomSuffix: false, allowOverwrite: true,
    });
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) throw new Error(`blob HEAD ${head.status}`);

    const res = await pool.query(
      `UPDATE tv_episodes SET thumbnail_url = $1 WHERE slug = $2 AND thumbnail_url IS NULL RETURNING slug`,
      [url, row.slug],
    );
    console.log(res.rowCount === 1 ? `  ✓ updated ${row.slug} → ${url}` : `  · ${row.slug} already had a thumbnail, skipped`);
  } catch (err) {
    failures.push({ slug: row.slug, reason: String(err?.message ?? err) });
    console.error(`  ✗ ${row.slug}: ${err?.message ?? err}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`, failures);
  process.exit(1);
}
console.log(APPLY ? '\nDone — all rows updated.' : `\nDry run complete — review the frames in ${OUT_DIR}/, then re-run with --apply.`);
process.exit(0);
