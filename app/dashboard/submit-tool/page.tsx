'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LoadingBar from '../../components/LoadingBar';
import { useUserProfile } from '../../hooks/useUserProfile';

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-sm';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';

const TOOL_CATEGORIES = [
  'AI', 'Audio', 'Video', 'Design', '3D', 'Animation', 'Music',
  'Photography', 'Writing', 'Development', 'Blockchain', 'Marketing',
  'Collaboration', 'Analytics', 'Other',
];

const PRICING_OPTIONS = ['Free', 'Freemium', 'Paid', 'Open Source'];

export default function SubmitToolPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { worldMemberships, loading } = useUserProfile();

  const [form, setForm] = useState({
    name: '',
    url: '',
    category: '',
    description: '',
    pricing: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !authenticated) router.push('/');
  }, [ready, authenticated, router]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <div className="flex items-center justify-center pt-40"><LoadingBar /></div>
      </div>
    );
  }

  if (!authenticated) return null;

  const isWorldAssociated = worldMemberships.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tool name is required'); return; }
    if (!user) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/tools/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, privyId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit tool');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Failed to submit tool');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <main className="container mx-auto max-w-xl px-4 sm:px-6 pt-28 pb-20 text-center">
          <h1 className="font-mono text-[13px] uppercase tracking-tight mb-4" style={{ color: 'var(--foreground)' }}>
            TOOL SUBMITTED
          </h1>
          <p className="font-mono text-[13px] opacity-70 mb-6" style={{ color: 'var(--foreground)' }}>
            Your tool has been submitted for review. It will appear on the site once approved.
          </p>
          <Link
            href="/dashboard"
            className="inline-block font-mono text-[13px] uppercase tracking-tight border px-4 py-2 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
          >
            BACK TO DASHBOARD
          </Link>
        </main>
      </div>
    );
  }

  if (!isWorldAssociated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <main className="container mx-auto max-w-xl px-4 sm:px-6 pt-28 pb-20 text-center">
          <p className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-4" style={{ color: 'var(--foreground)' }}>
            You must be associated with a world to submit tools.
          </p>
          <Link
            href="/dashboard"
            className="inline-block font-mono text-[13px] uppercase tracking-tight border px-4 py-2 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}
          >
            BACK TO DASHBOARD
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation />

      <main className="container mx-auto max-w-xl px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="font-mono text-[12px] uppercase tracking-tight opacity-40 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)' }}
          >
            ← Dashboard
          </Link>
        </div>

        <h1 className="font-mono text-[13px] uppercase tracking-tight mb-6" style={{ color: 'var(--foreground)' }}>
          SUBMIT A TOOL
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Tool Name *</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Midjourney"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>URL</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Category</label>
            <select
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'var(--background)' }}
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              <option value="">Select category...</option>
              {TOOL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Pricing</label>
            <select
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'var(--background)' }}
              value={form.pricing}
              onChange={(e) => setForm((p) => ({ ...p, pricing: e.target.value }))}
            >
              <option value="">Select pricing...</option>
              {PRICING_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Description</label>
            <textarea
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the tool..."
            />
          </div>

          {error && (
            <p className="font-mono text-[12px] text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="font-mono text-[13px] uppercase tracking-tight border px-5 py-2 hover:opacity-70 transition disabled:opacity-40"
            style={{
              color: 'var(--background)',
              backgroundColor: 'var(--foreground)',
              borderColor: 'var(--foreground)',
            }}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT TOOL'}
          </button>
        </form>
      </main>
    </div>
  );
}
