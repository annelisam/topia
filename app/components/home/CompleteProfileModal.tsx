'use client';

import { useState } from 'react';
import Link from 'next/link';
import RoleTagPicker from '../RoleTagPicker';
import { ROLE_TAGS } from '../../../lib/events/questions';

// The deferred half of signup. Account creation only asks for the essentials
// (name · handle · photo); this popup collects the rest — craft tags + bio —
// later, from /home. It is never shown right after signup: HomeClient gates it
// to accounts at least a day old, and dismissing snoozes it for days.
export default function CompleteProfileModal({
  privyId,
  initialRoleTags,
  initialBio,
  onClose,
}: {
  privyId: string;
  initialRoleTags: string[];
  initialBio: string;
  /** saved=true → the user hit save; false → dismissed ("maybe later"). */
  onClose: (saved: boolean) => void;
}) {
  const [roleTags, setRoleTags] = useState<string[]>(initialRoleTags);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // Only send what was actually filled in — /api/auth/sync treats an
      // absent key as "don't touch".
      const body: Record<string, unknown> = { privyId };
      if (roleTags.length > 0) body.roleTags = roleTags.join(',');
      if (bio.trim()) body.bio = bio.trim().slice(0, 280);
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('save failed');
      onClose(true);
    } catch {
      setError("Couldn't save — try again.");
      setSaving(false);
    }
  };

  const hasSomething = roleTags.length > 0 || !!bio.trim();

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center sm:items-center sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => onClose(false)}
    >
      <div
        className="w-full sm:max-w-md max-h-[85dvh] rounded-t-3xl sm:rounded-2xl border-0 sm:border flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle (mobile bottom-sheet affordance) */}
        <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full shrink-0" style={{ backgroundColor: 'var(--foreground)', opacity: 0.2 }} />

        <div className="flex items-start justify-between px-6 pt-4 sm:pt-6 pb-1 shrink-0">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] opacity-40 mb-1" style={{ color: 'var(--foreground)' }}>
              Your TOPIA passport
            </p>
            <p className="font-mono text-[15px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
              Finish your profile?
            </p>
          </div>
          <button
            onClick={() => onClose(false)}
            className="font-mono text-[18px] opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--foreground)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          <p className="font-mono text-[12px] leading-relaxed opacity-60" style={{ color: 'var(--foreground)' }}>
            Two quick things and your passport is done — they help the right people find you.
          </p>

          <div>
            <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
              What do you do?
            </label>
            <RoleTagPicker options={ROLE_TAGS} value={roleTags} onChange={setRoleTags} />
          </div>

          <div>
            <label className="block font-mono text-[12px] uppercase tracking-[0.12em] mb-1.5 font-bold opacity-60" style={{ color: 'var(--foreground)' }}>
              Bio
            </label>
            <textarea
              rows={3}
              maxLength={280}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you and what you're building…"
              className="w-full border px-4 py-3 font-mono text-[13px] rounded-xl outline-none transition focus:border-[var(--foreground)] resize-none"
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
            <p className="mt-1 font-mono text-[10px] opacity-40 text-right" style={{ color: 'var(--foreground)' }}>{bio.length}/280</p>
          </div>

          <p className="font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
            Want to add socials, links &amp; more?{' '}
            <Link href="/profile" className="underline" style={{ color: 'var(--foreground)' }}>Edit your full profile →</Link>
          </p>
        </div>

        <div className="shrink-0 px-6 py-4 border-t pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ borderColor: 'var(--border-color)' }}>
          {error && <p className="font-mono text-[12px] mb-3" style={{ color: '#FF5C34' }}>{error}</p>}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onClose(false)}
              className="px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border font-bold transition hover:opacity-80"
              style={{ backgroundColor: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              Maybe later
            </button>
            <button
              onClick={save}
              disabled={saving || !hasSomething}
              className="flex-1 px-4 py-3 font-mono text-[12px] uppercase tracking-widest rounded-lg cursor-pointer border-none font-bold disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {saving ? 'Saving…' : 'Save to my profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
