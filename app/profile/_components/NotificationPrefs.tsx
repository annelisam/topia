'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

// Notification preferences — self-contained (fetches + saves its own state)
// so the profile editor's big save flow stays untouched. One preference for
// now: the daily unread-DM digest email. Stored inverted (opt-OUT) so the
// default is on once the feature flag ships.
export default function NotificationPrefs() {
  const { user, authenticated } = usePrivy();
  const privyId = user?.id;
  const [optOut, setOptOut] = useState<boolean | null>(null); // null = loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authenticated || !privyId) return;
    let cancelled = false;
    fetch(`/api/auth/profile?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setOptOut(!!d?.user?.dmDigestOptOut); })
      .catch(() => { if (!cancelled) setOptOut(false); });
    return () => { cancelled = true; };
  }, [authenticated, privyId]);

  const toggle = async () => {
    if (optOut === null || saving || !privyId) return;
    const next = !optOut;
    setOptOut(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId, dmDigestOptOut: next }),
      });
      if (!res.ok) setOptOut(!next); // revert on failure
    } catch {
      setOptOut(!next);
    } finally { setSaving(false); }
  };

  const on = optOut === false; // digest ON = not opted out

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="font-mono text-[12px] font-bold uppercase tracking-[1px] text-ink">Unread-DM digest</p>
        <p className="font-mono text-[11px] text-ink/45 mt-0.5">
          One email a day, only when new messages arrived — never one per DM.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={optOut === null || saving}
        role="switch"
        aria-checked={on}
        aria-label="Unread-DM digest emails"
        className="relative w-12 h-7 rounded-full border-none cursor-pointer shrink-0 transition-colors disabled:opacity-40"
        style={{ backgroundColor: on ? 'var(--accent, #e4fe52)' : 'color-mix(in srgb, var(--page-text) 18%, transparent)' }}
      >
        <span
          className="absolute top-1 w-5 h-5 rounded-full transition-all"
          style={{ left: on ? 24 : 4, backgroundColor: on ? '#1a1a1a' : 'var(--page-bg)' }}
        />
      </button>
    </div>
  );
}
