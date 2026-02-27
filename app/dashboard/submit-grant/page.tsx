'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '../../components/Navigation';
import LoadingBar from '../../components/LoadingBar';
import { useUserProfile } from '../../hooks/useUserProfile';

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-lg';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';
const requiredCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold';

const GRANT_CATEGORIES = [
  'Art', 'Music', 'Film', 'Technology', 'Gaming', 'Fashion',
  'Education', 'Community', 'Environment', 'Social Impact', 'Other',
];

const DEADLINE_TYPES = ['Fixed', 'Rolling', 'Ongoing', 'TBD'];

const KNOWN_TAGS = [
  'art', 'artists', 'arts-org', 'base', 'black', 'creators',
  'crypto', 'dao', 'fellowship', 'femme', 'film', 'grant', 'interactive',
  'international', 'mentorship', 'music', 'nft', 'photography', 'poc',
  'public-goods', 'queer', 'residency', 'social', 'trans', 'visual arts', 'women'
];

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
    source: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // URL parser state
  const [parseUrl, setParseUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedSource, setParsedSource] = useState('');

  // Tag input state
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Derived tag list
  const selectedTags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (!normalized || selectedTags.includes(normalized)) return;
    const next = [...selectedTags, normalized];
    setForm((p) => ({ ...p, tags: next.join(', ') }));
    setTagInput('');
    setTagSuggestions([]);
    setShowSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    const next = selectedTags.filter((t) => t !== tag);
    setForm((p) => ({ ...p, tags: next.join(', ') }));
  };

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const lower = value.toLowerCase().trim();
      const matches = KNOWN_TAGS.filter(
        (t) => t.includes(lower) && !selectedTags.includes(t)
      );
      setTagSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setTagSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const handleParse = async () => {
    if (!parseUrl.trim() || !user) return;

    try {
      new URL(parseUrl);
    } catch {
      setParseError('Please enter a valid URL');
      return;
    }

    setParsing(true);
    setParseError('');
    setParseWarnings([]);
    setParsedSource('');

    try {
      const res = await fetch('/api/grants/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parseUrl, privyId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || 'Failed to parse URL');
        return;
      }

      const g = data.grant;
      setForm((prev) => ({
        ...prev,
        grantName: g.grantName || prev.grantName,
        orgName: g.orgName || prev.orgName,
        shortDescription: g.shortDescription || prev.shortDescription,
        link: g.link || prev.link,
        amountMin: g.amountMin != null ? String(g.amountMin) : prev.amountMin,
        amountMax: g.amountMax != null ? String(g.amountMax) : prev.amountMax,
        currency: g.currency || prev.currency,
        deadlineType: g.deadlineType || prev.deadlineType,
        deadlineDate: g.deadlineDate || prev.deadlineDate,
        region: g.region || prev.region,
        source: g.source || '',
      }));
      setParseWarnings(data.warnings || []);
      setParsedSource(g.source || '');
    } catch {
      setParseError('Failed to parse URL. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleClearParse = () => {
    setParseUrl('');
    setParseError('');
    setParseWarnings([]);
    setParsedSource('');
    setForm({
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
      source: '',
      notes: '',
    });
  };

  // Validation
  const validate = (): string | null => {
    if (!form.grantName.trim()) return 'Grant name is required';
    if (!form.orgName.trim()) return 'Organization is required';
    if (!form.link.trim()) return 'Link is required';
    if (!form.deadlineType) return 'Deadline type is required';
    if (selectedTags.length === 0) return 'At least one tag is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
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
            className="inline-block font-mono text-[13px] uppercase tracking-tight border rounded-lg px-4 py-2 hover:opacity-70 transition"
            style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
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
          SUBMIT A GRANT
        </h1>

        {/* URL Parser Section */}
        <div
          className="border rounded-lg p-4 mb-8"
          style={{ borderColor: 'var(--foreground)', opacity: 0.9 }}
        >
          <label className={labelCls} style={{ color: 'var(--foreground)' }}>
            Import from URL
          </label>
          <p className="font-mono text-[11px] opacity-50 mb-3" style={{ color: 'var(--foreground)' }}>
            Paste a grant page link to auto-fill the form below
          </p>

          {parsing ? (
            <LoadingBar text="PARSING GRANT PAGE..." />
          ) : parsedSource ? (
            <div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[12px] uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
                  Parsed from {parsedSource}
                </p>
                <button
                  type="button"
                  onClick={handleClearParse}
                  className="font-mono text-[11px] uppercase tracking-tight opacity-50 hover:opacity-100 transition underline"
                  style={{ color: 'var(--foreground)' }}
                >
                  Clear
                </button>
              </div>
              <p className="font-mono text-[11px] opacity-40 mt-1" style={{ color: 'var(--foreground)' }}>
                Review and edit the fields below before submitting.
              </p>
              {parseWarnings.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {parseWarnings.map((w, i) => (
                    <p key={i} className="font-mono text-[11px] text-amber-500">
                      ! {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
                  value={parseUrl}
                  onChange={(e) => { setParseUrl(e.target.value); setParseError(''); }}
                  placeholder="https://example.org/grants/..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleParse(); } }}
                />
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!parseUrl.trim()}
                  className="font-mono text-[12px] uppercase tracking-tight border rounded-lg px-4 py-2 hover:opacity-70 transition disabled:opacity-30 whitespace-nowrap"
                  style={{
                    color: 'var(--background)',
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--foreground)',
                  }}
                >
                  PARSE
                </button>
              </div>
              {parseError && (
                <p className="font-mono text-[11px] text-red-500 mt-2">{parseError}</p>
              )}
            </div>
          )}
        </div>

        {/* Verify notice after parsing */}
        {parsedSource && (
          <div
            className="border border-amber-400/50 rounded-lg px-4 py-3 mb-6"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
          >
            <p className="font-mono text-[11px] text-amber-600 uppercase tracking-tight font-bold">
              Please verify all fields before submitting
            </p>
            <p className="font-mono text-[11px] text-amber-600/70 mt-0.5">
              Auto-filled data may be incomplete or incorrect. Required fields are marked with *.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Grant Name - Required */}
          <div>
            <label className={requiredCls} style={{ color: 'var(--foreground)' }}>Grant Name *</label>
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.grantName}
              onChange={(e) => setForm((p) => ({ ...p, grantName: e.target.value }))}
              placeholder="e.g. Creative Capital Award"
            />
          </div>

          {/* Organization - Required */}
          <div>
            <label className={requiredCls} style={{ color: 'var(--foreground)' }}>Organization *</label>
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
            <input
              className={inputCls}
              style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
              value={form.shortDescription}
              onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
              placeholder="One sentence about what the grant funds"
              maxLength={200}
            />
          </div>

          {/* Link - Required */}
          <div>
            <label className={requiredCls} style={{ color: 'var(--foreground)' }}>Link *</label>
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

          {/* Deadline - Required */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={requiredCls} style={{ color: 'var(--foreground)' }}>Deadline Type *</label>
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

          {/* Tags - Required (at least one) */}
          <div>
            <label className={requiredCls} style={{ color: 'var(--foreground)' }}>Tags *</label>

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map((tag) => {
                  const isKnown = KNOWN_TAGS.includes(tag);
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 font-mono text-[11px] border px-2 py-1 rounded-lg"
                      style={{
                        borderColor: 'var(--foreground)',
                        color: 'var(--background)',
                        backgroundColor: 'var(--foreground)',
                      }}
                    >
                      {tag}
                      {!isKnown && (
                        <span className="text-[9px] opacity-60 ml-0.5" style={{ color: 'var(--background)' }}>new</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition"
                        style={{ color: 'var(--background)' }}
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Tag input with suggestions */}
            <div className="relative">
              <input
                ref={tagInputRef}
                className={inputCls}
                style={{ borderColor: 'var(--foreground)', color: 'var(--foreground)', backgroundColor: 'transparent' }}
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onFocus={() => { if (tagInput.trim()) setShowSuggestions(true); }}
                placeholder={selectedTags.length > 0 ? 'Add another tag...' : 'Type a tag and press Enter'}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && tagSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 left-0 right-0 mt-1 border rounded-lg max-h-40 overflow-y-auto"
                  style={{
                    borderColor: 'var(--foreground)',
                    backgroundColor: 'var(--background)',
                  }}
                >
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="w-full text-left px-3 py-1.5 font-mono text-[12px] hover:opacity-70 transition flex items-center justify-between"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <span>{tag}</span>
                      <span className="font-mono text-[9px] opacity-40 uppercase">existing</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="font-mono text-[10px] opacity-35 mt-1" style={{ color: 'var(--foreground)' }}>
              Press Enter or comma to add. You can create new tags or use existing ones.
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
            {submitting ? 'SUBMITTING...' : 'SUBMIT GRANT'}
          </button>
        </form>
      </main>
    </div>
  );
}
