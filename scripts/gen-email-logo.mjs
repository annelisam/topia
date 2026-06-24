// Renders the brand star (public/brand/logo.svg) into a self-contained email
// badge PNG: a lime rounded square with the black star centered. One raster
// asset that renders identically across email clients and inbox themes
// (light/dark), since SVG isn't supported in most email clients.
//
//   node scripts/gen-email-logo.mjs
//
// Output: public/brand/email-logo.png (3x — display at ~48px).

import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const src = readFileSync(new URL('../public/brand/logo.svg', import.meta.url), 'utf8');

// Pull the star path data out of the source SVG (single <path d="…">).
const d = src.match(/<path[^>]*\bd="([^"]+)"/)?.[1];
if (!d) { console.error('✗ could not find a <path d> in logo.svg'); process.exit(1); }

// Source star viewBox is 468×309 (landscape). Fit it into the badge with padding.
const SIZE = 144;          // 3x of a 48px display badge
const STAR_W = 96;         // star target width inside the badge
const scale = STAR_W / 468;
const starH = 309 * scale;
const tx = (SIZE - STAR_W) / 2;
const ty = (SIZE - starH) / 2;
const radius = 30;

const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="#e4fe52"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})">
    <path d="${d}" fill="#000000"/>
  </g>
</svg>`;

await sharp(Buffer.from(badge)).png().toFile(new URL('../public/brand/email-logo.png', import.meta.url).pathname);
console.log('✓ wrote public/brand/email-logo.png');
