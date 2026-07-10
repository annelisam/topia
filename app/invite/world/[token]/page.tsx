'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../../../components/Navigation';

/* Ghost-invite claim page — where the "claim your credit" email lands.
 * Shows who invited you to which world; login happens in place via the
 * Privy modal (no redirect round-trip), then one tap joins the world. */

interface Invitation {
  status: string;
  role: string;
  name: string | null;
  worldTitle: string;
  worldSlug: string;
  worldImageUrl: string | null;
  inviterName: string | null;
  inviterUsername: string | null;
}

export default function ClaimWorldInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, authenticated, ready, login } = usePrivy();

  const [inv, setInv] = useState<Invitation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState<{ slug: string | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/worlds/invitations/claim?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.invitation) setInv(d.invitation); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [token]);

  const claim = async () => {
    if (!user?.id) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/worlds/invitations/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, privyId: user.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not claim — try again.'); return; }
      setClaimed({ slug: d.worldSlug });
    } catch {
      setError('Could not claim — try again.');
    } finally { setBusy(false); }
  };

  const inviter = inv?.inviterName || inv?.inviterUsername || 'A world builder';
  const roleLabel = inv?.role === 'world_builder' ? 'builder' : 'collaborator';
  const alreadyUsed = inv && inv.status !== 'pending';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <div className="flex-1 flex items-center justify-center px-5 py-24">
        <div className="w-full max-w-sm rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border-color)' }}>
          {notFound ? (
            <>
              <p className="font-mono text-[14px] font-bold mb-2" style={{ color: 'var(--foreground)' }}>This invitation isn't active</p>
              <p className="font-mono text-[12px] opacity-60 mb-6" style={{ color: 'var(--foreground)' }}>It may have been revoked. Ask the world's builder to send a fresh one.</p>
              <Link href="/worlds" className="font-mono text-[12px] uppercase tracking-widest underline" style={{ color: 'var(--foreground)' }}>← Explore worlds</Link>
            </>
          ) : !inv ? (
            <p className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>Loading…</p>
          ) : (
            <>
              {inv.worldImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={inv.worldImageUrl} alt="" className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 border-2" style={{ borderColor: 'var(--border-color)' }} />
              ) : (
                <div className="w-20 h-20 rounded-xl mx-auto mb-4 flex items-center justify-center font-mono text-[22px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>
                  {inv.worldTitle[0]?.toUpperCase()}
                </div>
              )}
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>World invitation</p>
              <h1 className="text-xl font-bold uppercase tracking-tight mb-2" style={{ color: 'var(--foreground)' }}>{inv.worldTitle}</h1>
              <p className="font-mono text-[12px] opacity-70 mb-5" style={{ color: 'var(--foreground)' }}>
                {inviter} credited {inv.name ? <b>{inv.name}</b> : 'you'} as a {roleLabel}.
                {inv.status === 'pending' && ' Claim it to link your profile and join the crew.'}
              </p>

              {claimed ? (
                <div>
                  <p className="font-mono text-[13px] font-bold mb-4" style={{ color: 'var(--accent-ink)' }}>✓ You're in</p>
                  <Link
                    href={claimed.slug ? `/worlds/${claimed.slug}` : '/worlds'}
                    className="inline-block w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg font-bold no-underline"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  >
                    Enter {inv.worldTitle} →
                  </Link>
                </div>
              ) : alreadyUsed ? (
                <p className="font-mono text-[12px] opacity-60" style={{ color: 'var(--foreground)' }}>
                  This invitation was already claimed.{' '}
                  <Link href={`/worlds/${inv.worldSlug}`} className="underline">Visit the world →</Link>
                </p>
              ) : ready && !authenticated ? (
                <button onClick={login}
                  className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  Log in to claim
                </button>
              ) : ready ? (
                <button onClick={claim} disabled={busy}
                  className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  {busy ? 'Claiming…' : '✦ Claim your credit'}
                </button>
              ) : null}

              {error && <p className="font-mono text-[12px] mt-4" style={{ color: '#FF5C34' }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
