// Deterministic fallback avatar — a colored background + the first initial —
// for users who haven't uploaded a profile photo. Pure (safe on server + client
// + Satori). The color is hashed from a seed so a given user is always the same.

const PALETTE = ['#e4fe52', '#4F46FF', '#FF5BD7', '#FF5C34', '#00C2A8', '#6A2CC2', '#F59E0B', '#2D9CDB'];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColor(seed: string): string {
  return PALETTE[hash(seed || '?') % PALETTE.length];
}

// Black or bone text, whichever contrasts better with the bg.
export function avatarTextColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '#0a0a0a' : '#f5f0e8';
}

export function avatarInitial(name?: string | null): string {
  return ((name || '').trim()[0] || '?').toUpperCase();
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// An <img>-ready SVG data URI fallback avatar. Renders in browsers everywhere
// (profile, discover, comments); the card image route renders its own native
// version with the same color so it stays consistent in Satori.
export function fallbackAvatarDataUrl(name?: string | null, seed?: string): string {
  const initial = avatarInitial(name);
  const bg = avatarColor(seed || name || initial);
  const fg = avatarTextColor(bg);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="${bg}"/><text x="120" y="120" dy="0.34em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="bold" fill="${fg}">${esc(initial)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// True only for a real uploaded photo (not null / not a generated SVG fallback).
export function isRealPhoto(url?: string | null): boolean {
  return !!url && !url.startsWith('data:image/svg');
}
