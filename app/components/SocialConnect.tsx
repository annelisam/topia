'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { SocialIcon } from './SocialIcons';

export type SocialProvider = 'twitter' | 'instagram' | 'linkedin' | 'spotify' | 'farcaster';

const ALL_PROVIDERS: SocialProvider[] = ['twitter', 'instagram', 'linkedin', 'spotify', 'farcaster'];

/**
 * Which providers should actually render in the UI. Driven by the
 * NEXT_PUBLIC_SOCIAL_PROVIDERS env var (comma-separated). Flip each one on
 * as you finish setting it up in Privy → Login Methods.
 *
 * Example: NEXT_PUBLIC_SOCIAL_PROVIDERS="twitter,linkedin"
 *
 * Default if unset: ['twitter'] only — that's the one Privy ships with
 * managed OAuth credentials out of the box.
 */
export const ENABLED_SOCIAL_PROVIDERS: SocialProvider[] = (() => {
  const raw = process.env.NEXT_PUBLIC_SOCIAL_PROVIDERS;
  if (!raw) return ['twitter'];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((p): p is SocialProvider => ALL_PROVIDERS.includes(p as SocialProvider));
})();

interface Props {
  provider: SocialProvider;
  /** Current stored URL (from DB). When non-empty, switches to "Connected as @handle". */
  value: string;
  /** Update the URL. Called with the constructed profile URL after connect, or '' after disconnect. */
  onChange: (url: string) => void;
  /** Optional accent color for the button border/text. Defaults to lime. */
  accent?: string;
  /**
   * Called right before Privy redirects to the provider's OAuth page. Use it
   * to persist any unsaved form state so it's still there when the user lands
   * back on this page after authenticating. May return a promise.
   */
  onBeforeConnect?: () => void | Promise<void>;
}

/* ── Privy linked-account shape (tolerant) ─────────────────── */

interface OAuthAccount {
  type: string;
  subject?: string;
  username?: string;
  name?: string;
  vanityName?: string;
  /** Farcaster-only */
  fid?: number;
  displayName?: string;
}

/* ── Provider metadata table ───────────────────────────────── */

interface ProviderMeta {
  display: string;
  iconType: string;
  shortLabel: string;
  oauthType: 'twitter_oauth' | 'instagram_oauth' | 'linkedin_oauth' | 'spotify_oauth' | 'farcaster';
  /** Build the canonical public-profile URL from a Privy linked account. */
  buildUrl: (a: OAuthAccount) => string;
  /** Visible label shown next to the green dot. */
  buildLabel: (a: OAuthAccount) => string;
  /** Best-effort: pull a display handle out of an existing pasted URL (for legacy data). */
  parseHandle: (url: string) => string | null;
}

function parsePathHandle(url: string): string | null {
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? seg.replace(/^@/, '') : null;
  } catch { return null; }
}

const PROVIDER_META: Record<SocialProvider, ProviderMeta> = {
  twitter: {
    display:    'X (Twitter)',
    iconType:   'twitter',
    shortLabel: 'x',
    oauthType:  'twitter_oauth',
    buildUrl:   (a) => a.username ? `https://x.com/${a.username}` : '',
    buildLabel: (a) => a.username ? `@${a.username}` : 'Connected',
    parseHandle: parsePathHandle,
  },
  instagram: {
    display:    'Instagram',
    iconType:   'instagram',
    shortLabel: 'instagram',
    oauthType:  'instagram_oauth',
    buildUrl:   (a) => a.username ? `https://instagram.com/${a.username}` : '',
    buildLabel: (a) => a.username ? `@${a.username}` : 'Connected',
    parseHandle: parsePathHandle,
  },
  linkedin: {
    display:    'LinkedIn',
    iconType:   'linkedin',
    shortLabel: 'linkedin',
    oauthType:  'linkedin_oauth',
    buildUrl:   (a) => {
      if (a.vanityName) return `https://linkedin.com/in/${a.vanityName}`;
      if (a.subject)    return `https://linkedin.com/in/${a.subject}`;
      return '';
    },
    buildLabel: (a) => a.name || a.vanityName || 'Connected',
    parseHandle: (url) => {
      try {
        const u = new URL(url.includes('://') ? url : `https://${url}`);
        const parts = u.pathname.split('/').filter(Boolean);
        const inIdx = parts.indexOf('in');
        return inIdx >= 0 ? (parts[inIdx + 1] ?? null) : null;
      } catch { return null; }
    },
  },
  spotify: {
    display:    'Spotify',
    iconType:   'spotify',
    shortLabel: 'spotify',
    oauthType:  'spotify_oauth',
    buildUrl:   (a) => a.subject ? `https://open.spotify.com/user/${a.subject}` : '',
    buildLabel: (a) => a.name || 'Connected',
    parseHandle: (url) => {
      try {
        const u = new URL(url.includes('://') ? url : `https://${url}`);
        const parts = u.pathname.split('/').filter(Boolean);
        const userIdx = parts.indexOf('user');
        return userIdx >= 0 ? (parts[userIdx + 1] ?? null) : null;
      } catch { return null; }
    },
  },
  farcaster: {
    display:    'Farcaster',
    iconType:   'farcaster',
    shortLabel: 'farcaster',
    oauthType:  'farcaster',
    buildUrl:   (a) => {
      if (a.username) return `https://warpcast.com/${a.username}`;
      if (a.fid)      return `https://warpcast.com/~/profiles/${a.fid}`;
      return '';
    },
    buildLabel: (a) => a.username ? `@${a.username}` : (a.displayName || a.name || 'Connected'),
    parseHandle: parsePathHandle,
  },
};

/* ── Mapping: provider → social column name in DB ──────────── */

const SOCIAL_FIELD_NAME: Record<SocialProvider, string> = {
  twitter:   'socialTwitter',
  instagram: 'socialInstagram',
  linkedin:  'socialLinkedin',
  spotify:   'socialSpotify',
  farcaster: 'socialFarcaster',
};

/* ── Helpers ───────────────────────────────────────────────── */

function findOAuthAccount(user: unknown, oauthType: ProviderMeta['oauthType']): OAuthAccount | null {
  const u = user as {
    linkedAccounts?: OAuthAccount[];
    twitter?: OAuthAccount;
    instagram?: OAuthAccount;
    linkedin?: OAuthAccount;
    spotify?: OAuthAccount;
    farcaster?: OAuthAccount;
  } | null;
  if (!u) return null;
  // Convenience getters on user object (when available)
  if (oauthType === 'twitter_oauth'   && u.twitter)   return u.twitter;
  if (oauthType === 'instagram_oauth' && u.instagram) return u.instagram;
  if (oauthType === 'linkedin_oauth'  && u.linkedin)  return u.linkedin;
  if (oauthType === 'spotify_oauth'   && u.spotify)   return u.spotify;
  if (oauthType === 'farcaster'       && u.farcaster) return u.farcaster;
  return u.linkedAccounts?.find((a) => a.type === oauthType) ?? null;
}

/* ── Component ─────────────────────────────────────────────── */

export default function SocialConnect({ provider, value, onChange, accent = '#e4fe52', onBeforeConnect }: Props) {
  const privy = usePrivy();
  const { ready, authenticated, user } = privy;
  const [busy, setBusy] = useState<'connect' | 'disconnect' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = PROVIDER_META[provider];
  const linked = findOAuthAccount(user, meta.oauthType);
  // After a successful unlink, Privy's user state may take a render or two to update.
  // We treat "value empty AND no linked account" as fully disconnected.
  const isConnected = Boolean(linked || value);

  const linkedLabel  = linked ? meta.buildLabel(linked) : null;
  const legacyHandle = !linked && value ? meta.parseHandle(value) : null;
  const displayLabel = linkedLabel ?? (legacyHandle ? `@${legacyHandle}` : (value ? 'Connected' : ''));

  /** Persist a connect or disconnect to the DB so the public profile shows it. */
  async function persistToDb(url: string | null, mode: 'verify' | 'unverify') {
    if (!user?.id) return;
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          [SOCIAL_FIELD_NAME[provider]]: url,
          [mode === 'verify' ? 'verifyProvider' : 'unverifyProvider']: provider,
        }),
      });
    } catch (err) {
      console.error(`persist ${mode} ${provider} failed`, err);
    }
  }

  // When Privy linking finishes, push the URL up AND save it to the DB
  // (so the public profile reflects the new verified connection immediately).
  useEffect(() => {
    if (!ready || !authenticated || !linked) return;
    const expected = meta.buildUrl(linked);
    if (expected && expected !== value) {
      onChange(expected);
      void persistToDb(expected, 'verify');
    }
    if (busy === 'connect') setBusy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked?.subject, linked?.username, ready, authenticated]);

  // Safety net: if the OAuth popup is dismissed / blocked / the user closes the tab,
  // Privy never fires success or error. Reset busy after 15s so the button isn't stuck.
  useEffect(() => {
    if (busy !== 'connect') return;
    const t = setTimeout(() => setBusy(null), 15_000);
    return () => clearTimeout(t);
  }, [busy]);

  function callLink() {
    if (provider === 'twitter')   return privy.linkTwitter();
    if (provider === 'instagram') return privy.linkInstagram();
    if (provider === 'linkedin')  return privy.linkLinkedIn();
    if (provider === 'spotify')   return privy.linkSpotify();
    if (provider === 'farcaster') return privy.linkFarcaster();
  }

  async function callUnlink(subject: string) {
    if (provider === 'twitter')   return privy.unlinkTwitter(subject);
    if (provider === 'instagram') return privy.unlinkInstagram(subject);
    if (provider === 'linkedin')  return privy.unlinkLinkedIn(subject);
    if (provider === 'spotify')   return privy.unlinkSpotify(subject);
    if (provider === 'farcaster') {
      // Farcaster identifies linked accounts by numeric FID, not a string subject
      const fid = linked?.fid;
      if (!fid) throw new Error('No Farcaster fid found to unlink');
      return privy.unlinkFarcaster(fid);
    }
  }

  function readableError(err: unknown): string {
    const raw =
      err instanceof Error ? err.message
      : typeof err === 'string' ? err
      : err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message)
      : '';
    // Privy throws "Login with X not allowed" when the provider isn't enabled in the dashboard.
    if (/login with .* not allowed/i.test(raw)) {
      return `${meta.display} isn't enabled yet — turn it on in dashboard.privy.io → Login Methods.`;
    }
    if (!raw) return 'Something went wrong — try again in a moment.';
    return raw;
  }

  async function handleConnect() {
    setError(null);
    setBusy('connect');
    try {
      // Persist unsaved form state before Privy does its full-page redirect
      // (the SDK doesn't support popup mode for social link methods).
      if (onBeforeConnect) {
        await onBeforeConnect();
      }
      // Wrap in microtask so async throws from Privy SDK still land in our catch
      await Promise.resolve().then(() => callLink());
      // Privy redirects to OAuth; the success effect above completes the round-trip.
    } catch (err) {
      console.error(`link ${provider} failed`, err);
      setError(readableError(err));
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setBusy('disconnect');
    try {
      // Farcaster uses fid (number); other providers use subject (string).
      if (linked && (linked.subject || linked.fid)) {
        await callUnlink(linked.subject ?? '');
      }
      onChange('');
      await persistToDb(null, 'unverify');
    } catch (err) {
      console.error(`unlink ${provider} failed`, err);
      // If the account isn't actually linked on Privy's side (e.g. they
      // already revoked it elsewhere) we still want to clear the stale URL.
      onChange('');
      await persistToDb(null, 'unverify');
      setError(readableError(err));
    } finally {
      setBusy(null);
    }
  }

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
              {displayLabel || 'Connected'}
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
          {busy === 'connect' ? 'opening…' : `+ connect ${meta.shortLabel}`}
        </button>
      )}

      {error && (
        <div
          className="mt-2"
          style={{
            fontFamily: 'GT Zirkon, sans-serif',
            fontSize: 10,
            letterSpacing: '0.06em',
            color: '#FF5BD7',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
