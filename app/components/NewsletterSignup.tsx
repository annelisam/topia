'use client';

import { useState } from 'react';

// Newsletter sign-up band for the bottom of the home page. Collects a first
// name + email and posts to the existing /api/waitlist endpoint.
export default function NewsletterSignup() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const canSubmit = firstName.trim() && email.trim() && status !== 'submitting';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: firstName.trim(), email: email.trim(), source: 'home-newsletter' }),
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

  const onEdit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (status === 'error') setStatus('idle');
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
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 px-6 py-7 md:px-8 md:py-8">
          <div className="md:flex-1 min-w-0">
            <h2 className="font-basement font-black text-[clamp(22px,2.8vw,32px)] leading-[0.95] uppercase text-bone">
              Don&apos;t miss a drop.
            </h2>
            <p className="font-mono text-[12px] text-bone/45 leading-relaxed mt-2 max-w-sm">
              New worlds, events, and Topia TV — straight to your inbox. No noise.
            </p>
          </div>

          <div className="w-full md:w-[420px] shrink-0">
            {status === 'done' ? (
              <div className="flex items-start gap-3 rounded-lg border border-lime/30 bg-lime/[0.06] px-4 py-3.5">
                <span className="mt-0.5 w-7 h-7 rounded-full bg-lime text-obsidian flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-basement font-black uppercase text-[15px] leading-tight text-bone">
                    You&apos;re on the list.
                  </p>
                  <p className="font-mono text-[11px] text-bone/50 mt-1">
                    Welcome{firstName.trim() ? `, ${firstName.trim()}` : ''} — watch your inbox.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Field
                    label="Name"
                    value={firstName}
                    onChange={onEdit(setFirstName)}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={onEdit(setEmail)}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="font-mono text-[12px] uppercase tracking-[2px] font-bold bg-lime text-obsidian rounded-lg px-6 py-3 hover:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'Joining…' : 'Subscribe →'}
                </button>
                <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-bone/25">
                  {error ? <span className="text-pink normal-case tracking-normal">{error}</span> : 'No spam. Unsubscribe anytime.'}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Themed input: a mono uppercase label sits inside the field, the border lights
// lime on focus — mirrors the field styling used across the app.
function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex-1 flex items-center gap-2.5 bg-bone/[0.05] border border-bone/12 rounded-lg px-3.5 py-2.5 transition-colors focus-within:border-lime focus-within:bg-bone/[0.07]">
      <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/35 shrink-0">{label}</span>
      <input
        {...props}
        className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono text-[13px] text-bone placeholder:text-bone/20"
      />
    </label>
  );
}
