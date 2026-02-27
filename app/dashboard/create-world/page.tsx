'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LoadingBar from '../../components/LoadingBar';
import { useUserProfile } from '../../hooks/useUserProfile';

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-lg';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';

const WORLD_CATEGORIES = [
  'Art', 'Music', 'Film', 'Gaming', 'Fashion', 'Technology',
  'Photography', 'Dance', 'Theater', 'Literature', 'Design', 'Other',
];

export default function CreateWorldPage() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { worldMemberships, loading } = useUserProfile();

  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    category: '',
    country: '',
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
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

  const isWorldBuilder = worldMemberships.some((wm) => wm.role === 'world_builder');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('World title is required'); return; }
    if (!user) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/worlds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, privyId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create world');
        return;
      }
      // Redirect to the new world's edit page
      router.push(`/worlds/${data.world.slug}/edit`);
    } catch {
      setError('Failed to create world');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isWorldBuilder) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <main className="container mx-auto max-w-xl px-4 sm:px-6 pt-28 pb-20 text-center">
          <p className="font-mono text-[13px] uppercase tracking-tight opacity-50 mb-4" style={{ color: 'var(--foreground)' }}>
            You must be an existing worldbuilder to create new worlds.
          </p>
          <Link
            href="/dashboard"
            className="inline-block font-mono text-[13px] uppercase tracking-tight border rounded-lg px-4 py-2 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
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
          CREATE A WORLD
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>World Title *</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Your world's name"
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
              placeholder="A brief description of your world..."
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
              {WORLD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Country</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              placeholder="e.g. US, UK, DE"
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Cover Image URL</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
            <p className="font-mono text-[10px] opacity-40 mt-1" style={{ color: 'var(--foreground)' }}>
              You can update this later from the world edit page.
            </p>
          </div>

          {error && (
            <p className="font-mono text-[12px] text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="font-mono text-[13px] uppercase tracking-tight border rounded-lg px-5 py-2 hover:opacity-70 transition disabled:opacity-40"
            style={{
              color: 'var(--background)',
              backgroundColor: 'var(--foreground)',
              borderColor: 'var(--foreground)',
            }}
          >
            {submitting ? 'CREATING...' : 'CREATE WORLD'}
          </button>
        </form>
      </main>
    </div>
  );
}
