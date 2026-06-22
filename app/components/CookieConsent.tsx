'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'topia-cookie-consent';

// Persisted choices. "essential" = declined non-essential; "all" = accepted.
type Consent = 'all' | 'essential' | 'dismissed';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // Only decide visibility on the client to avoid hydration mismatch.
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable — stay hidden */
    }
  }, []);

  const choose = useCallback((consent: Consent) => {
    try {
      localStorage.setItem(STORAGE_KEY, consent);
      // Let any future analytics opt-in/out hook react to the choice.
      window.dispatchEvent(
        new CustomEvent('topia-cookie-consent', { detail: consent }),
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed left-0 w-full z-[1500] px-3 md:px-6 pointer-events-none"
      style={{
        // Sit above the mobile bottom tab bar; clear the home-bar safe area.
        bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom) + 12px)',
      }}
    >
      <div
        className="pointer-events-auto mx-auto max-w-[var(--content-max)] bg-obsidian text-bone border border-bone/[0.12] rounded-lg shadow-2xl relative"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      >
        {/* Close — treat as "essential only" so it doesn't re-nag. */}
        <button
          onClick={() => choose('dismissed')}
          aria-label="Dismiss cookie notice"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center font-mono text-bone/40 hover:text-bone transition-colors"
        >
          ✕
        </button>

        <div className="p-5 md:p-6 pr-12 md:pr-14 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-[2px] text-lime mb-2">
              cookies // notice
            </div>
            <p className="font-zirkon text-[13px] md:text-sm text-bone/70 leading-relaxed max-w-2xl">
              We use essential cookies to keep you signed in and remember your
              preferences, plus optional analytics to improve Topia. Read our{' '}
              <Link
                href="/legal/cookies"
                className="text-bone underline underline-offset-2 decoration-lime hover:decoration-bone transition-colors"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => choose('essential')}
              className="font-mono text-[12px] uppercase tracking-[1px] px-4 py-2.5 rounded-sm border border-bone/20 text-bone/80 hover:border-bone/50 hover:text-bone transition-colors whitespace-nowrap"
            >
              Essential only
            </button>
            <button
              onClick={() => choose('all')}
              className="font-mono text-[12px] uppercase tracking-[1px] px-5 py-2.5 rounded-sm transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent, #e4fe52)', color: 'var(--accent-text, #1a1a1a)' }}
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
