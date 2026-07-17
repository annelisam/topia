'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

/* Connect your In Process (inprocess.world) account — the "Sign in with
 * In•Process" email OTP flow. Once connected, minting moments from world
 * dashboards posts to YOUR onchain timeline. The API key this creates is
 * stored encrypted server-side and never shown anywhere; it can be revoked
 * anytime at inprocess.world/manage/api-keys or by disconnecting here. */

const inputCls = 'w-full border border-ink/15 bg-transparent px-3 py-2 font-mono text-[16px] sm:text-[13px] rounded-sm outline-none text-ink placeholder:text-ink/30 focus:border-ink/40';
const btnLime = 'font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian font-bold px-3 py-1.5 rounded-sm hover:opacity-90 transition cursor-pointer border-none disabled:opacity-40';

type Status =
  | { state: 'loading' }
  | { state: 'unconfigured' }
  | { state: 'disconnected' }
  | { state: 'connected'; artistAddress: string };

export default function InProcessConnectCard() {
  const { user, authenticated, getAccessToken } = usePrivy();
  const privyId = user?.id;
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!privyId) return;
    fetch(`/api/in-process/connect?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return setStatus({ state: 'disconnected' });
        if (!d.configured) return setStatus({ state: 'unconfigured' });
        setStatus(d.connected ? { state: 'connected', artistAddress: d.artistAddress } : { state: 'disconnected' });
      })
      .catch(() => setStatus({ state: 'disconnected' }));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (authenticated && privyId) load(); }, [authenticated, privyId]);

  const call = async (path: string, body: Record<string, unknown>) => {
    const accessToken = await getAccessToken().catch(() => null);
    const res = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId, accessToken, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    return { ok: res.ok, error: d.error as string | undefined, data: d };
  };

  const sendCode = async () => {
    setBusy(true); setError('');
    try {
      const r = await call('/api/in-process/connect/start', { email: email.trim() });
      if (!r.ok) { setError(r.error || 'Could not send the code.'); return; }
      setStep('code');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setError('');
    try {
      const r = await call('/api/in-process/connect/verify', { email: email.trim(), code: code.trim() });
      if (!r.ok) { setError(r.error || 'Could not verify.'); return; }
      setStep('email'); setEmail(''); setCode('');
      load();
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setError('');
    try {
      const accessToken = await getAccessToken().catch(() => null);
      await fetch('/api/in-process/connect', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, accessToken }),
      });
      load();
    } finally { setBusy(false); }
  };

  if (!authenticated) return null;

  return (
    <div>
      <p className="font-mono text-[11px] text-ink/45 mb-3">
        <a href="https://inprocess.world" target="_blank" rel="noopener noreferrer" className="underline text-ink/60">In Process</a> is
        a collective onchain timeline for artists (by LATASHÁ). Connect yours and Topia can mint
        process moments straight from your world roadmaps.
      </p>

      {status.state === 'loading' && <p className="font-mono text-[11px] text-ink/35">Checking connection…</p>}

      {status.state === 'unconfigured' && (
        <p className="font-mono text-[11px] text-ink/35">Not available on this server yet.</p>
      )}

      {status.state === 'connected' && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-bold" style={{ color: 'var(--accent-ink, var(--foreground))' }}>✓ Connected</p>
            <a
              href={`https://inprocess.world/${status.artistAddress}`}
              target="_blank" rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink/50 underline break-all"
            >
              {status.artistAddress.slice(0, 6)}…{status.artistAddress.slice(-4)} ↗
            </a>
          </div>
          <button onClick={disconnect} disabled={busy} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none shrink-0" style={{ color: '#FF5C34' }}>
            Disconnect
          </button>
        </div>
      )}

      {status.state === 'disconnected' && (
        <div className="space-y-2">
          {step === 'email' ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="The email you use on inprocess.world"
                className={inputCls}
              />
              <button onClick={sendCode} disabled={busy || !email.includes('@')} className={btnLime}>
                {busy ? 'Sending…' : 'Send me a code'}
              </button>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] text-ink/50">In Process emailed a 6-digit code to {email}.</p>
              <input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className={`${inputCls} tracking-[6px]`}
              />
              <div className="flex items-center gap-3">
                <button onClick={verify} disabled={busy || code.length !== 6} className={btnLime}>
                  {busy ? 'Connecting…' : 'Connect'}
                </button>
                <button onClick={() => { setStep('email'); setCode(''); }} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none text-ink/50">
                  Different email
                </button>
              </div>
            </>
          )}
          {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
