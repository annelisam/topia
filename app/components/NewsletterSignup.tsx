'use client';

import { useState } from 'react';

// Compact newsletter sign-up for the home page. Posts to the existing
// /api/waitlist endpoint (email-only — name is optional there).
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || status === 'submitting') return;
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'home-newsletter' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <section className="mb-4">
      <div className="relative rounded-xl overflow-hidden border bg-obsidian px-6 py-9 md:px-10 md:py-11" style={{ borderColor: 'var(--border-color)' }}>
        {/* Halftone texture to match the hero */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(rgba(245,240,232,1) 1px, transparent 1px)', backgroundSize: '6px 6px' }}
        />
        <div className="relative max-w-xl">
          <span className="font-mono text-[11px] uppercase tracking-[3px] text-lime block mb-2">stay in the loop</span>
          <h2 className="font-basement font-black text-[clamp(22px,3vw,36px)] leading-[0.95] uppercase text-bone mb-3">
            Get the dispatch.
          </h2>
          <p className="font-mono text-[12px] text-bone/50 mb-6 leading-relaxed">
            New worlds, events, and Topia TV drops — straight to your inbox. No spam.
          </p>

          {status === 'done' ? (
            <div className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[1px] text-lime">
              <span className="w-6 h-6 rounded-full bg-lime text-obsidian flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              You&apos;re in. Welcome to Topia.
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="your@email.com"
                aria-label="Email address"
                className="flex-1 bg-bone/[0.04] border border-bone/15 focus:border-lime/50 rounded-lg px-4 py-3 font-mono text-[14px] text-bone placeholder:text-bone/25 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="font-mono text-[12px] uppercase tracking-[2px] font-bold bg-lime text-obsidian rounded-lg px-6 py-3 hover:brightness-95 transition disabled:opacity-50 shrink-0"
              >
                {status === 'submitting' ? 'Joining…' : 'Subscribe →'}
              </button>
            </form>
          )}
          {error && <p className="font-mono text-[11px] text-pink mt-3">{error}</p>}
        </div>
      </div>
    </section>
  );
}
