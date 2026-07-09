'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../../components/Navigation';

/* /connect/<code> — where a personal Topia QR lands when scanned with a
 * plain camera app. Shows whose code it is with a one-tap Connect (mutual
 * follow + "met at" context). Login happens in place via the Privy modal —
 * no redirect round-trip, so no post-login intent stashing is needed. */

interface Person { userId: string; name: string | null; username: string | null; avatarUrl: string | null; bio: string | null; }

export default function ConnectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, authenticated, ready, login } = usePrivy();
  const privyId = user?.id;

  const [person, setPerson] = useState<Person | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'connected' | 'already' | 'self' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/connect/resolve?code=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPerson(d); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [token]);

  const connect = async () => {
    if (!privyId) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, code: token }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(d.already ? 'already' : 'connected');
      } else if (d.error === "That's your own code") {
        setDone('self');
      } else {
        setError(d.error || 'Could not connect — try again.');
      }
    } catch {
      setError('Could not connect — try again.');
    } finally { setBusy(false); }
  };

  const displayName = person?.name || person?.username || 'Topian';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />
      <div className="flex-1 flex items-center justify-center px-5 py-24">
        <div className="w-full max-w-sm rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--border-color)' }}>
          {notFound ? (
            <>
              <p className="font-mono text-[14px] font-bold mb-2" style={{ color: 'var(--foreground)' }}>This code isn't active</p>
              <p className="font-mono text-[12px] opacity-60 mb-6" style={{ color: 'var(--foreground)' }}>It may have been regenerated. Ask them to show their current Topia code.</p>
              <Link href="/" className="font-mono text-[12px] uppercase tracking-widest underline" style={{ color: 'var(--foreground)' }}>← Home</Link>
            </>
          ) : !person ? (
            <p className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>Loading…</p>
          ) : (
            <>
              {person.avatarUrl
                ? <img src={person.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
                : <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center font-mono text-[24px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>{displayName[0].toUpperCase()}</div>}
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-50 mb-1" style={{ color: 'var(--foreground)' }}>Topia code</p>
              <h1 className="text-xl font-bold uppercase tracking-tight mb-0.5" style={{ color: 'var(--foreground)' }}>{displayName}</h1>
              {person.username && <p className="font-mono text-[12px] opacity-50 mb-3" style={{ color: 'var(--foreground)' }}>@{person.username}</p>}
              {person.bio && <p className="font-mono text-[12px] opacity-70 mb-5 line-clamp-3" style={{ color: 'var(--foreground)' }}>{person.bio}</p>}

              {done === 'connected' && (
                <div className="mb-4">
                  <p className="font-mono text-[13px] font-bold mb-1" style={{ color: 'var(--accent-ink)' }}>✓ Connected</p>
                  <p className="font-mono text-[11px] opacity-60" style={{ color: 'var(--foreground)' }}>You now follow each other — DMs are open.</p>
                </div>
              )}
              {done === 'already' && (
                <p className="font-mono text-[13px] font-bold mb-4" style={{ color: 'var(--accent-ink)' }}>✓ Already connected</p>
              )}
              {done === 'self' && (
                <p className="font-mono text-[12px] opacity-70 mb-4" style={{ color: 'var(--foreground)' }}>This is your own code — show it to someone else so they can connect with you.</p>
              )}
              {error && <p className="font-mono text-[12px] mb-4" style={{ color: '#FF5C34' }}>{error}</p>}

              {!done && ready && !authenticated && (
                <button onClick={login}
                  className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  Log in to connect
                </button>
              )}
              {!done && ready && authenticated && (
                <button onClick={connect} disabled={busy}
                  className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  {busy ? 'Connecting…' : '✦ Connect'}
                </button>
              )}

              {person.username && (
                <Link href={`/profile/${person.username}`}
                  className="inline-block mt-4 font-mono text-[11px] uppercase tracking-widest underline opacity-70 hover:opacity-100"
                  style={{ color: 'var(--foreground)' }}>
                  View profile →
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
