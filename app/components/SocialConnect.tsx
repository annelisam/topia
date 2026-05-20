'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { SocialIcon } from './SocialIcons';

export type SocialProvider = 'twitter' | 'instagram';

interface Props {
  provider: SocialProvider;
  /** Current stored URL (from DB). When non-empty, the connect button switches to "Connected as @handle". */
  value: string;
  /** Update the URL. Called with the constructed profile URL after connect, or '' after disconnect. */
  onChange: (url: string) => void;
  /** Optional accent color for the button border/text. Defaults to lime. */
  accent?: string;
}

/* ── helpers ───────────────────────────────────────────────── */

/**
 * Pull the username out of a stored profile URL (e.g. https://x.com/foo → foo).
 * Tolerant of formats the user may have pasted previously.
 */
function handleFromUrl(provider: SocialProvider, url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    if (!seg) return null;
    return seg.replace(/^@/, '');
  } catch {
    return null;
  }
}

function urlFor(provider: SocialProvider, handle: string): string {
  if (provider === 'twitter')   return `https://x.com/${handle}`;
  if (provider === 'instagram') return `https://instagram.com/${handle}`;
  return '';
}

const LABEL: Record<SocialProvider, { display: string; iconType: string }> = {
  twitter:   { display: 'X (Twitter)', iconType: 'twitter' },
  instagram: { display: 'Instagram',   iconType: 'instagram' },
};

/* ── Privy account extraction ──────────────────────────────── */

interface OAuthAccount {
  type: string;
  subject?: string;
  username?: string;
  name?: string;
}

function findOAuthAccount(user: unknown, providerType: 'twitter_oauth' | 'instagram_oauth'): OAuthAccount | null {
  const u = user as { linkedAccounts?: OAuthAccount[]; twitter?: OAuthAccount; instagram?: OAuthAccount } | null;
  if (!u) return null;
  if (providerType === 'twitter_oauth'  && u.twitter)   return u.twitter as OAuthAccount;
  if (providerType === 'instagram_oauth' && u.instagram) return u.instagram as OAuthAccount;
  return u.linkedAccounts?.find((a) => a.type === providerType) ?? null;
}

/* ── Component ─────────────────────────────────────────────── */

export default function SocialConnect({ provider, value, onChange, accent = '#e4fe52' }: Props) {
  const { ready, authenticated, user, linkTwitter, linkInstagram, unlinkTwitter, unlinkInstagram } = usePrivy();
  const [busy, setBusy] = useState<'connect' | 'disconnect' | null>(null);

  const oauthType = provider === 'twitter' ? 'twitter_oauth' : 'instagram_oauth';
  const linked = findOAuthAccount(user, oauthType);
  const linkedHandle = linked?.username ?? handleFromUrl(provider, value);
  const isConnected = Boolean(linked || value);

  // When Privy linking finishes, push the constructed URL up to the parent so it gets saved
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (linked?.username) {
      const expected = urlFor(provider, linked.username);
      if (expected !== value) onChange(expected);
      if (busy === 'connect') setBusy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked?.username, ready, authenticated]);

  async function handleConnect() {
    setBusy('connect');
    try {
      if (provider === 'twitter')   linkTwitter();
      if (provider === 'instagram') linkInstagram();
      // Privy redirects to the OAuth flow; the effect above completes the loop.
    } catch (err) {
      console.error(`link ${provider} failed`, err);
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setBusy('disconnect');
    try {
      if (linked?.subject) {
        if (provider === 'twitter')   await unlinkTwitter(linked.subject);
        if (provider === 'instagram') await unlinkInstagram(linked.subject);
      }
      onChange('');
    } catch (err) {
      console.error(`unlink ${provider} failed`, err);
    } finally {
      setBusy(null);
    }
  }

  const meta = LABEL[provider];

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
      <div
        style={{
          fontFamily: 'GT Zirkon, sans-serif',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase' as const,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: accent, opacity: 0.8 }}>
          <SocialIcon type={meta.iconType} />
        </span>
        {meta.display}
      </div>

      {isConnected ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: '#00FF88' }}
            />
            <span
              className="truncate"
              style={{ fontFamily: 'GT Zirkon, sans-serif', fontSize: 13, color: '#fff' }}
            >
              {linkedHandle ? `@${linkedHandle}` : 'Connected'}
            </span>
            {value && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition no-underline"
                style={{
                  fontFamily: 'GT Zirkon, sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase' as const,
                }}
              >
                view →
              </a>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="hover:opacity-70 transition disabled:opacity-30"
            style={{
              fontFamily: 'GT Zirkon, sans-serif',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.4)',
              background: 'none',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase' as const,
            }}
          >
            {busy === 'disconnect' ? 'removing…' : 'disconnect'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={!ready || !authenticated || busy !== null}
          className="hover:brightness-110 transition disabled:opacity-40"
          style={{
            fontFamily: 'GT Zirkon, sans-serif',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            padding: '6px 14px',
            backgroundColor: 'transparent',
            color: accent,
            border: `1px solid ${accent}`,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy === 'connect' ? 'opening…' : `+ connect ${provider === 'twitter' ? 'x' : 'instagram'}`}
        </button>
      )}
    </div>
  );
}
