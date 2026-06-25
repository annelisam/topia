'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const CATEGORIES = [
  { key: 'bug', label: 'Bug' },
  { key: 'idea', label: 'Idea' },
  { key: 'other', label: 'Other' },
];

// Global feedback widget: a collapsible tab on the right edge that opens a
// slide-in drawer. Logged-in only. Submissions become labelled GitHub issues
// via /api/feedback.
export default function FeedbackWidget() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ url: string } | null>(null);
  const [error, setError] = useState('');

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!ready || !authenticated) return null; // feedback is for signed-in users

  const reset = () => { setMessage(''); setError(''); setDone(null); setCategory('bug'); };
  const close = () => { setOpen(false); };

  const submit = async () => {
    if (!message.trim()) { setError('Please add a description.'); return; }
    setSubmitting(true); setError('');
    try {
      const accessToken = await getAccessToken().catch(() => null);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user?.id,
          accessToken,
          category,
          message: message.trim(),
          url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          viewport: typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback.');
      setDone({ url: data.url });
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Edge handle — slim backdrop-blur pull tab (mirrors the mobile nav
          handle). Hidden while the drawer is open. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-[1900] flex flex-col items-center gap-1.5 px-1.5 py-3.5 rounded-l-xl border-t border-l border-b cursor-pointer transition-[opacity,padding] duration-200 hover:pr-2 ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-text)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ writingMode: 'vertical-rl' }}>Feedback</span>
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[1950] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-[380px] max-w-[90vw] z-[1960] border-l flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)', boxShadow: '-24px 0 60px -24px rgba(0,0,0,0.6)' }}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[15px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>Feedback</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[1.5px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>Beta</span>
            </div>
            <p className="font-mono text-[11px] opacity-50 mt-1 leading-snug" style={{ color: 'var(--foreground)' }}>
              Topia is in beta and still growing — spotted a bug or have an idea? Tell us, it goes straight to the team.
            </p>
          </div>
          <button onClick={close} className="font-mono text-[18px] leading-none opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {done ? (
            <div className="text-center py-6">
              <div className="font-basement text-[22px] font-black uppercase leading-none mb-2" style={{ color: 'var(--foreground)' }}>Thank you!</div>
              <p className="font-mono text-[12px] opacity-60 mb-5 leading-snug" style={{ color: 'var(--foreground)' }}>
                Your feedback was logged. We read every one.
              </p>
              <a href={done.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] uppercase tracking-widest underline opacity-60 hover:opacity-100 transition" style={{ color: 'var(--foreground)' }}>
                View issue ↗
              </a>
              <div className="mt-6">
                <button onClick={reset} className="font-mono text-[12px] uppercase tracking-widest underline bg-transparent border-none cursor-pointer opacity-70 hover:opacity-100" style={{ color: 'var(--accent-ink)' }}>
                  Send another
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-2 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>Type</label>
              <div className="flex gap-2 mb-5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className="flex-1 px-3 py-2 font-mono text-[11px] uppercase tracking-wider rounded-lg border cursor-pointer transition font-bold"
                    style={category === c.key
                      ? { backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }
                      : { backgroundColor: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-2 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
                {category === 'bug' ? 'What went wrong?' : category === 'idea' ? 'What would you like to see?' : 'Tell us more'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder={category === 'bug' ? 'Describe the bug and how to reproduce it…' : 'Share your thoughts…'}
                className="w-full border px-4 py-3 font-mono text-[13px] rounded-xl outline-none transition focus:border-[var(--foreground)] resize-none"
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />

              <p className="mt-2 font-mono text-[10px] opacity-40 leading-snug" style={{ color: 'var(--foreground)' }}>
                We&rsquo;ll attach the current page and your handle so we can follow up.
              </p>

              {error && <p className="mt-3 font-mono text-[12px]" style={{ color: '#FF5C34' }}>{error}</p>}

              <button
                onClick={submit}
                disabled={submitting || !message.trim()}
                className="mt-5 w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
