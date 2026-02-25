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

const GRANT_CATEGORIES = [
  'Art', 'Music', 'Film', 'Technology', 'Gaming', 'Fashion',
  'Education', 'Community', 'Environment', 'Social Impact', 'Other',
];

const DEADLINE_TYPES = ['Fixed', 'Rolling', 'Ongoing', 'TBD'];

export default function SubmitGrantPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { worldMemberships, loading } = useUserProfile();

  const [form, setForm] = useState({
    grantName: '',
    orgName: '',
    shortDescription: '',
    link: '',
    amountMin: '',
    amountMax: '',
    currency: 'USD',
    tags: '',
    deadlineType: '',
    deadlineDate: '',
    region: '',
    category: '',
    eligibility: '',
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
    if (!form.grantName.trim()) { setError('Grant name is required'); return; }
    if (!user) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/grants/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, privyId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit grant');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Failed to submit grant');
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
            GRANT SUBMITTED
          </h1>
          <p className="font-mono text-[13px] opacity-70 mb-6" style={{ color: 'var(--foreground)' }}>
            Your grant has been submitted for review. It will appear on the site once approved.
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
            You must be associated with a world to submit grants.
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
          SUBMIT A GRANT
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Grant Name *</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.grantName}
              onChange={(e) => setForm((p) => ({ ...p, grantName: e.target.value }))}
              placeholder="e.g. Creative Capital Award"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Organization</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.orgName}
              onChange={(e) => setForm((p) => ({ ...p, orgName: e.target.value }))}
              placeholder="Funding organization name"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Short Description</label>
            <textarea
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              rows={3}
              value={form.shortDescription}
              onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
              placeholder="Brief description of the grant..."
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Link</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.link}
              onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Amount Min</label>
              <input
                type="number"
                className={inputCls}
                style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
                value={form.amountMin}
                onChange={(e) => setForm((p) => ({ ...p, amountMin: e.target.value }))}
                placeholder="1000"
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Amount Max</label>
              <input
                type="number"
                className={inputCls}
                style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
                value={form.amountMax}
                onChange={(e) => setForm((p) => ({ ...p, amountMax: e.target.value }))}
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Currency</label>
            <select
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'var(--background)' }}
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="ETH">ETH</option>
            </select>
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
              {GRANT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Deadline Type</label>
              <select
                className={inputCls}
                style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'var(--background)' }}
                value={form.deadlineType}
                onChange={(e) => setForm((p) => ({ ...p, deadlineType: e.target.value }))}
              >
                <option value="">Select...</option>
                {DEADLINE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Deadline Date</label>
              <input
                type="date"
                className={inputCls}
                style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
                value={form.deadlineDate}
                onChange={(e) => setForm((p) => ({ ...p, deadlineDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Region</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.region}
              onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
              placeholder="e.g. Global, US, Europe"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Tags</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="Comma-separated: art, music, technology"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Eligibility</label>
            <textarea
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              rows={2}
              value={form.eligibility}
              onChange={(e) => setForm((p) => ({ ...p, eligibility: e.target.value }))}
              placeholder="Who is eligible to apply?"
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
            {submitting ? 'SUBMITTING...' : 'SUBMIT GRANT'}
          </button>
        </form>
      </main>
    </div>
  );
}
