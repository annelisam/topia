'use client';

import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'saving' | 'saved' | 'error';

interface Options {
  /** Privy user id; if null the hook is a no-op. */
  privyId: string | null | undefined;
  /** Delay before save fires after last change (ms). */
  delayMs?: number;
  /** Skip the first save right after initial hydration. */
  skipInitial?: boolean;
}

/**
 * Watches a values object; whenever it changes, debounces a POST to
 * /api/auth/sync with only the diff. Returns a small status object so
 * the UI can render a "saving…" / "✓ saved" indicator.
 */
export function useAutoSave<T extends Record<string, unknown>>(values: T, options: Options) {
  const { privyId, delayMs = 800, skipInitial = true } = options;
  const [status, setStatus] = useState<Status>('idle');
  const prevValuesRef = useRef<T | null>(null);
  const skipRef = useRef(skipInitial);

  useEffect(() => {
    if (!privyId) return;
    if (skipRef.current) {
      skipRef.current = false;
      prevValuesRef.current = values;
      return;
    }

    // Compute diff between previous values and current
    const prev = prevValuesRef.current ?? {};
    const diff: Record<string, unknown> = {};
    for (const k of Object.keys(values)) {
      if ((prev as Record<string, unknown>)[k] !== values[k]) {
        diff[k] = values[k];
      }
    }
    prevValuesRef.current = values;

    if (Object.keys(diff).length === 0) return;

    setStatus('saving');
    const t = setTimeout(async () => {
      try {
        const body: Record<string, unknown> = { privyId };
        for (const [k, v] of Object.entries(diff)) {
          if (Array.isArray(v)) {
            body[k] = (v as string[]).join(',') || null;
          } else {
            body[k] = v;
          }
        }
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setStatus(res.ok ? 'saved' : 'error');
        if (res.ok) {
          // brief "saved" then back to idle
          setTimeout(() => setStatus('idle'), 1600);
        }
      } catch {
        setStatus('error');
      }
    }, delayMs);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), privyId]);

  return status;
}
