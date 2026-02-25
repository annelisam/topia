'use client';

import React from 'react';

/* ── Social Platform Config ─────────────────────────────────── */

export const SOCIAL_PLATFORMS = [
  { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/handle' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/handle' },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/handle' },
  { key: 'substack', label: 'Substack', placeholder: 'https://handle.substack.com' },
] as const;

/* ── SocialIcon ──────────────────────────────────────────────── */

export function SocialIcon({ type, size = 18 }: { type: string; size?: number }) {
  const s = size;

  switch (type) {
    case 'website':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg width={s * 0.89} height={s * 0.89} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'soundcloud':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.058-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .09-.037.099-.094l.209-1.282-.21-1.332c-.009-.06-.042-.094-.099-.094m1.837-1.165c-.064 0-.107.042-.117.105l-.204 2.486.204 2.395c.01.065.053.105.117.105.063 0 .105-.04.115-.105l.236-2.395-.236-2.486c-.01-.063-.052-.105-.115-.105m.899-.061c-.073 0-.12.046-.127.114l-.18 2.553.18 2.439c.007.071.054.115.127.115s.12-.044.127-.115l.204-2.439-.204-2.553c-.007-.068-.054-.114-.127-.114m.922-.149c-.082 0-.135.054-.141.131l-.158 2.696.158 2.459c.006.08.059.131.141.131.08 0 .133-.051.141-.131l.182-2.459-.182-2.696c-.008-.077-.061-.131-.141-.131m.928-.161c-.091 0-.148.06-.154.14l-.136 2.858.136 2.465c.006.087.063.143.154.143.087 0 .147-.056.154-.143l.158-2.465-.158-2.858c-.007-.08-.067-.14-.154-.14m.93-.18c-.098 0-.161.066-.166.154l-.117 3.035.117 2.469c.005.098.068.16.166.16.096 0 .159-.062.166-.16l.133-2.469-.133-3.035c-.007-.088-.07-.154-.166-.154m.93-.175c-.107 0-.174.073-.178.167l-.098 3.207.098 2.469c.004.1.071.169.178.169.104 0 .173-.069.178-.169l.114-2.469-.114-3.207c-.005-.094-.074-.167-.178-.167m.965.07c-.116 0-.19.076-.193.178l-.079 2.96.079 2.466c.003.109.077.182.193.182.113 0 .189-.073.193-.182l.092-2.466-.092-2.96c-.004-.102-.08-.178-.193-.178m.958-.408c-.122 0-.2.08-.204.19l-.058 3.346.058 2.46c.004.116.082.196.204.196.119 0 .2-.08.204-.196l.07-2.46-.07-3.346c-.004-.11-.085-.19-.204-.19m1.003-.147c-.131 0-.215.092-.218.207l-.04 3.496.04 2.453c.003.122.087.21.218.21.129 0 .213-.088.218-.21l.048-2.453-.048-3.496c-.005-.115-.089-.207-.218-.207m.969-.166c-.14 0-.228.1-.23.222l-.021 3.664.021 2.445c.002.131.09.226.23.226.137 0 .228-.095.23-.226l.028-2.445-.028-3.664c-.002-.122-.093-.222-.23-.222m1.553.391c-.02-.146-.124-.238-.272-.238-.148 0-.252.092-.272.238l-.02 3.262.02 2.436c.02.146.124.24.272.24.148 0 .252-.094.272-.24l.024-2.436-.024-3.262m.669-1.653c-.015 0-.027.002-.04.003-.138 0-.24.088-.26.229l-.018 4.912.018 2.427c.02.146.122.234.26.234.137 0 .24-.088.258-.234l.022-2.427-.022-4.912c-.018-.141-.121-.232-.258-.232m1.16-.437c-.256 0-.464.21-.464.467v6.884c0 .258.208.468.464.468h4.293C22.56 17.551 24 16.121 24 14.334c0-1.787-1.44-3.218-3.217-3.218-.497 0-.967.115-1.387.315-.3-1.774-1.845-3.127-3.707-3.127" />
        </svg>
      );
    case 'spotify':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={s * 0.94} height={s * 0.94} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'substack':
      return (
        <svg width={s * 0.89} height={s * 0.89} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── SocialIconLink (for display pages) ──────────────────────── */

const SOCIAL_LABELS: Record<string, string> = {
  website: 'Website',
  twitter: 'X / Twitter',
  instagram: 'Instagram',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  linkedin: 'LinkedIn',
  substack: 'Substack',
};

export function SocialIconLink({ type, url }: { type: string; url: string }) {
  if (!url) return null;
  const href = url.startsWith('http') ? url : `https://${url}`;
  const label = SOCIAL_LABELS[type];
  if (!label) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 theme-hover-invert"
      style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
      title={label}
    >
      <SocialIcon type={type} size={18} />
    </a>
  );
}
