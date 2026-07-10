'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboard } from '../_components/DashboardContext';
import { resizeAndUploadImage } from '../../../lib/uploadImage';
import { getWorldConfig } from '../../components/world/worldConfig';

const WORLD_CATEGORIES = [
  'Art', 'Music', 'Film', 'Gaming', 'Fashion', 'Technology',
  'Photography', 'Dance', 'Theater', 'Literature', 'Design', 'Other',
];

const STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'story', label: 'Story' },
  { id: 'review', label: 'Review' },
] as const;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Create-world lives INSIDE the dashboard shell (sidebar + nav come from
 * dashboard/layout.tsx — this page must not render its own chrome).
 * Three steps — Identity → Story → Review — with a live world-card preview
 * and a draft option, instead of a single form that publishes instantly.
 */
export default function CreateWorldPage() {
  const { user } = usePrivy();
  const router = useRouter();
  const { profile } = useDashboard();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    country: '',
    imageUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Catalysts can't create worlds — bounce to the overview.
  useEffect(() => {
    if (profile?.path === 'catalyst') router.replace('/dashboard');
  }, [profile?.path, router]);

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await resizeAndUploadImage(file, 1024);
      setForm((p) => ({ ...p, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (publish: boolean) => {
    if (!form.title.trim()) { setError('World title is required'); setStep(0); return; }
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/worlds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, published: publish, privyId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create world');
        return;
      }
      router.push(`/dashboard/worlds/${data.world.slug}`);
    } catch {
      setError('Failed to create world');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0 && !form.title.trim()) { setError('World title is required'); return; }
    setError('');
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const previewSlug = slugify(form.title) || 'your-world';
  const cfg = getWorldConfig(previewSlug);
  const inputCls = 'w-full bg-transparent border border-ink/15 rounded-sm px-3 py-2.5 font-mono text-[16px] md:text-[13px] text-ink outline-none focus:border-[var(--accent-ink)]/60 transition-colors';
  const labelCls = 'font-mono text-[10px] font-semibold uppercase tracking-[2px] text-ink/50 block mb-1.5';

  return (
    <div className="max-w-2xl">
      {/* Header band */}
      <div className="border border-ink/[0.08] rounded-lg overflow-hidden mb-6">
        <div className="bg-lime px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/50 block">topia://new-world</span>
          <h1 className="font-basement font-black text-[clamp(22px,3.5vw,32px)] uppercase leading-[0.9] text-obsidian mt-0.5">
            Create a world.
          </h1>
        </div>
        <div className="bg-[var(--page-bg)] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[12px] text-ink/50 leading-relaxed">
            A world is your scene — a project, collective, or community creators rally around.
          </p>
          {/* Step progress */}
          <div className="flex items-center gap-1.5 shrink-0">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`h-[4px] w-8 rounded-full border-none p-0 transition-colors ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ backgroundColor: i <= step ? 'var(--accent, #e4fe52)' : 'color-mix(in srgb, var(--foreground) 15%, transparent)' }}
                aria-label={`Step ${i + 1}: ${s.label}`}
              />
            ))}
            <span className="font-mono text-[10px] uppercase tracking-[1.5px] text-ink/40 ml-1.5">
              {step + 1}/{STEPS.length} · {STEPS[step].label}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-ink/[0.08] rounded-lg overflow-hidden">
        <div className="bg-[var(--page-bg)] p-5 space-y-5">

          {/* ── Step 1 · IDENTITY ── */}
          {step === 0 && (
            <>
              <div>
                <label className={labelCls}>World title <span className="text-ink/30">*</span></label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Your world's name"
                  autoFocus
                />
                {form.title.trim() && (
                  <span className="font-mono text-[11px] text-ink/35 mt-1.5 block">topia://{previewSlug}</span>
                )}
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {WORLD_CATEGORIES.map((cat) => {
                    const active = form.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, category: active ? '' : cat }))}
                        className={`font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1.5 rounded-sm border transition cursor-pointer ${
                          active
                            ? 'bg-lime text-obsidian border-lime font-bold'
                            : 'bg-transparent text-ink/55 border-ink/15 hover:border-ink/40 hover:text-ink'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>World image</label>
                <div className="flex items-center gap-3">
                  {form.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-sm object-cover border border-ink/15 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-sm border border-dashed border-ink/20 bg-ink/[0.03] shrink-0" />
                  )}
                  <label className={`font-mono text-[11px] uppercase tracking-[1px] border border-ink/15 rounded-sm px-3 py-2 transition ${uploading ? 'opacity-40' : 'cursor-pointer text-ink/60 hover:border-ink/40 hover:text-ink'}`}>
                    {uploading ? 'Uploading…' : form.imageUrl ? 'Change' : 'Upload'}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => handleImage(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {form.imageUrl && !uploading && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                      className="font-mono text-[11px] uppercase tracking-[1px] text-ink/40 hover:text-ink transition bg-transparent border-none cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2 · STORY ── */}
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Declaration</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
                  placeholder="One or two lines on what this world is about — shown on your dossier"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>The longer story <span className="text-ink/30">(optional)</span></label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What you're building, who it's for, how people can plug in"
                />
              </div>
              <div className="max-w-[240px]">
                <label className={labelCls}>Country</label>
                <input
                  className={inputCls}
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. US, UK, DE"
                />
              </div>
            </>
          )}

          {/* ── Step 3 · REVIEW — live dossier preview + publish choice ── */}
          {step === 2 && (
            <>
              <span className={labelCls}>How your world card reads</span>
              <div className="border border-ink/[0.08] rounded-lg overflow-hidden max-w-md">
                <div className={`${cfg.bg} px-3 py-1.5 flex items-center justify-between`}>
                  <span className={`font-mono text-[9px] uppercase tracking-[2px] ${cfg.textOn} opacity-70`}>topia://world</span>
                  <span className={`font-mono text-[9px] uppercase tracking-[2px] ${cfg.textOn} opacity-55`}>DRAFT</span>
                </div>
                <div className="bg-[var(--page-bg)] p-4 flex gap-4 items-center">
                  {form.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-md object-cover border-2 border-ink/20 shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-md border-2 border-ink/20 bg-ink/5 flex items-center justify-center shrink-0">
                      <span className="font-basement font-black text-[13px] text-ink/25 uppercase text-center leading-none">{form.title.slice(0, 6) || '—'}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-basement font-black text-[20px] uppercase leading-none text-ink truncate">{form.title || 'Untitled'}</h2>
                    <p className="font-mono text-[11px] text-ink/45 mt-1 truncate">topia://{previewSlug}{form.category ? ` · ${form.category.toUpperCase()}` : ''}</p>
                    {form.shortDescription && (
                      <p className="font-zirkon text-[11px] italic text-ink/50 mt-1.5 line-clamp-2">&ldquo;{form.shortDescription}&rdquo;</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="font-mono text-[11px] text-ink/40 leading-relaxed max-w-md">
                Publish now, or keep it a draft — drafts live in your dashboard where you can add
                projects, tools, and crew before the world goes public.
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-[var(--page-bg)] border-t border-ink/[0.06] px-5 py-3 flex items-center gap-3 flex-wrap">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setError(''); setStep((s) => s - 1); }}
              className="font-mono text-[11px] uppercase tracking-[2px] text-ink/50 hover:text-ink transition bg-transparent border border-ink/15 rounded-sm px-3 py-2 cursor-pointer"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm hover:opacity-90 transition cursor-pointer border-none font-bold"
            >
              Next: {STEPS[step + 1].label} →
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={submitting || uploading}
                className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm hover:opacity-90 transition disabled:opacity-40 cursor-pointer border-none font-bold"
              >
                {submitting ? 'Creating…' : 'Publish world'}
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={submitting || uploading}
                className="font-mono text-[11px] uppercase tracking-[2px] text-ink/60 hover:text-ink border border-ink/15 rounded-sm px-3 py-2 transition disabled:opacity-40 cursor-pointer bg-transparent"
              >
                Save as draft
              </button>
            </>
          )}
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 hover:text-ink transition no-underline ml-auto"
          >
            Cancel
          </Link>
          {error && <span className="font-mono text-[11px] text-orange w-full">{error}</span>}
        </div>
      </div>
    </div>
  );
}
