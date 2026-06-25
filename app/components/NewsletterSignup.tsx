'use client';

import { useState } from 'react';

// Newsletter sign-up band for the bottom of the home page. Posts to the
// existing /api/waitlist endpoint (email-only — name is optional there).
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
    <section className="relative z-10 mb-4">
      <div className="rounded-xl overflow-hidden border bg-obsidian" style={{ borderColor: 'var(--border-color)' }}>
        {/* Terminal-style header strip, matching the other home modules */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-bone/[0.08]">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40">topia://dispatch</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime" />
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-lime">Newsletter</span>
          </span>
        </div>

        {/* Balanced two-column body — copy left, form right, vertically centered */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 px-6 py-7 md:px-8 md:py-8">
          <div className="md:flex-1 min-w-0">
            <h2 className="font-basement font-black text-[clamp(22px,2.8vw,32px)] leading-[0.95] uppercase text-bone">
              Don&apos;t miss a drop.
            </h2>
            <p className="font-mono text-[12px] text-bone/45 leading-relaxed mt-2 max-w-sm">
              New worlds, events, and Topia TV — straight to your inbox. No noise.
            </p>
          </div>

          <div className="w-full md:w-[400px] shrink-0">
            {status === 'done' ? (
              <div className="flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[1px] text-lime py-3">
                <span className="w-6 h-6 rounded-full bg-lime text-obsidian flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                You&apos;re in. Welcome to Topia.
              </div>
            ) : (
              <>
                <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                    placeholder="your@email.com"
                    aria-label="Email address"
                    className="flex-1 bg-bone/[0.05] border border-bone/15 focus:border-lime rounded-lg px-4 py-3 font-mono text-[13px] text-bone placeholder:text-bone/25 outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="font-mono text-[12px] uppercase tracking-[2px] font-bold bg-lime text-obsidian rounded-lg px-6 py-3 hover:brightness-95 transition disabled:opacity-50 shrink-0"
                  >
                    {status === 'submitting' ? 'Joining…' : 'Subscribe'}
                  </button>
                </form>
                <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-bone/25 mt-2.5">
                  {error ? <span className="text-pink">{error}</span> : 'No spam. Unsubscribe anytime.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
