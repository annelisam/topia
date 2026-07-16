'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMessagesBadge } from '../MessagesNavIcon';
import { useUserProfile } from '../../hooks/useUserProfile';
import { isCoreProfileComplete } from '../../../lib/profile/completeness';
import AddToHomeScreenSheet from '../AddToHomeScreenSheet';
import TopiaMark from './TopiaMark';

interface FrostedPillProps {
  onMenuToggle: () => void;
  onOpenMessages: () => void;
  onOpenCard: () => void;
}

interface LiveEvent { slug: string; eventName: string; checkedIn: boolean; isHost: boolean }

// One live-now lookup per minute across all FrostedPill mounts (the nav
// remounts on every route change — don't re-hit the API each time).
let liveCache: { at: number; date: string; privyId: string; event: LiveEvent | null } | null = null;

function localDate(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function useLiveEvent(privyId: string | undefined): LiveEvent | null {
  const [live, setLive] = useState<LiveEvent | null>(() =>
    liveCache && liveCache.privyId === privyId ? liveCache.event : null);
  useEffect(() => {
    if (!privyId) { setLive(null); return; }
    const date = localDate();
    if (liveCache && liveCache.privyId === privyId && liveCache.date === date && Date.now() - liveCache.at < 60_000) {
      setLive(liveCache.event);
      return;
    }
    let cancelled = false;
    fetch(`/api/events/live-now?privyId=${encodeURIComponent(privyId)}&date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const event = (d?.event as LiveEvent | undefined) ?? null;
        liveCache = { at: Date.now(), date, privyId, event };
        if (!cancelled) setLive(event);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [privyId]);
  return live;
}

// The mobile nav: a detached frosted-glass pill floating above the bottom
// edge, content scrolling behind it. Always visible — no collapse gesture.
// The active tab sits in a soft circle; unread state is a brand-orange dot
// (the pill has no labels, so dots do the talking). The avatar slot opens
// the full takeover menu (profile, TV, resources, theme, auth).
export default function FrostedPill({ onMenuToggle, onOpenMessages, onOpenCard }: FrostedPillProps) {
  const pathname = usePathname();
  const messagesBadge = useMessagesBadge();
  const { profile, authenticated } = useUserProfile();
  const liveEvent = useLiveEvent(authenticated ? profile?.privyId : undefined);
  // Hide the chip while already in Event Mode — it would link to itself.
  const showLiveChip = !!liveEvent && !pathname.endsWith('/live');

  // Add-to-home-screen: a lime chip that opens the full explainer sheet, plus
  // a one-time auto-open of that sheet for signed-in mobile users (the nav is
  // md:hidden, so desktop never sees either). Chip dismissal is forever (same
  // key as Event Mode's old hint); the auto-open fires once ever.
  const [installState, setInstallState] = useState<'hidden' | 'chip'>('hidden');
  const [installSheetOpen, setInstallSheetOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('topia:install-hint') === 'dismissed';
    setInstallState(!standalone && !dismissed ? 'chip' : 'hidden');
  }, []);
  useEffect(() => {
    if (!authenticated || installState === 'hidden') return;
    try { if (localStorage.getItem('topia:a2hs-sheet-seen')) return; } catch { return; }
    const t = setTimeout(() => setInstallSheetOpen(true), 1500);
    return () => clearTimeout(t);
  }, [authenticated, installState]);
  const closeInstallSheet = () => {
    setInstallSheetOpen(false);
    try { localStorage.setItem('topia:a2hs-sheet-seen', '1'); } catch { /* private mode */ }
  };
  const dismissInstall = () => {
    setInstallState('hidden');
    try { localStorage.setItem('topia:install-hint', 'dismissed'); } catch { /* private mode */ }
  };
  // Finish-your-passport nudge: a user without name+username is invisible on
  // Topia (no guest-list entry, no DM search, no profile URL) — worth a
  // persistent-but-polite chip. Dismiss lasts the session (it returns next
  // visit, because the broken state persists too). Hidden while already in
  // onboarding, and while the profile is still loading (null ≠ incomplete).
  const [passportDismissed, setPassportDismissed] = useState(true);
  useEffect(() => {
    try { setPassportDismissed(sessionStorage.getItem('topia:passport-chip') === 'dismissed'); } catch { setPassportDismissed(false); }
  }, []);
  const dismissPassport = () => {
    setPassportDismissed(true);
    try { sessionStorage.setItem('topia:passport-chip', 'dismissed'); } catch { /* private mode */ }
  };
  const showPassportChip =
    authenticated && !!profile && !isCoreProfileComplete(profile) &&
    !passportDismissed && !pathname.startsWith('/onboarding') && !showLiveChip;

  // One chip at a time — live event > passport > install nudge.
  const showInstallChip = authenticated && installState !== 'hidden' && !showLiveChip && !showPassportChip;

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/' || pathname === '/home'
      : pathname === href || pathname.startsWith(`${href}/`);

  // 52px targets (down from 56) so the sixth item — the Topia card — still
  // fits inside 375px with room to breathe.
  const itemCls =
    'relative flex items-center justify-center w-[52px] h-[52px] rounded-full no-underline bg-transparent border-none cursor-pointer transition-[background-color,opacity] duration-200';
  const itemStyle = (on: boolean): React.CSSProperties => ({
    color: 'var(--page-text)',
    opacity: on ? 1 : 0.72,
    backgroundColor: on ? 'color-mix(in srgb, var(--page-text) 18%, transparent)' : 'transparent',
  });
  const dot = (
    <span
      className="absolute top-[9px] right-[9px] w-[9px] h-[9px] rounded-full"
      style={{ backgroundColor: '#FF5C34', border: '2px solid var(--page-bg)' }}
    />
  );

  const initial = (profile?.name || profile?.username || '?')[0]?.toUpperCase() ?? '?';

  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 right-0 z-[1000] md:hidden flex flex-col items-center gap-2 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
    >
      {/* Live-event quick access — one tap from anywhere into Event Mode
          when an event you're part of is happening today */}
      {showLiveChip && liveEvent && (
        <Link
          href={`/events/${liveEvent.slug}/live`}
          className="pointer-events-auto flex items-center gap-2 rounded-full border pl-3.5 pr-4 py-2 no-underline backdrop-blur-xl max-w-[88vw]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--page-bg) 85%, transparent)',
            borderColor: 'color-mix(in srgb, var(--orange, #FF5C34) 55%, transparent)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'var(--orange, #FF5C34)' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] truncate" style={{ color: 'var(--page-text)' }}>
            Live · {liveEvent.eventName}
          </span>
          <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--orange, #FF5C34)' }}>→</span>
        </Link>
      )}

      {/* Nudge chips: lime fill + obsidian text so they read as THE action
          on the screen, in both themes. */}
      {showPassportChip && (
        <div
          className="pointer-events-auto flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 max-w-[88vw]"
          style={{ backgroundColor: 'var(--lime, #e4fe52)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)' }}
        >
          <Link href="/onboarding" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] no-underline truncate" style={{ color: '#1a1a1a' }}>
            ✦ Finish your passport — 60 seconds
          </Link>
          <button onClick={dismissPassport} aria-label="Dismiss" className="bg-transparent border-none cursor-pointer text-[15px] leading-none p-0 shrink-0" style={{ color: '#1a1a1a', opacity: 0.55 }}>×</button>
        </div>
      )}

      {showInstallChip && (
        <div
          className="pointer-events-auto flex items-center gap-2.5 rounded-full pl-4 pr-3 py-2.5 max-w-[88vw]"
          style={{ backgroundColor: 'var(--lime, #e4fe52)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)' }}
        >
          <button
            onClick={() => setInstallSheetOpen(true)}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] bg-transparent border-none cursor-pointer p-0 truncate"
            style={{ color: '#1a1a1a' }}
          >
            ＋ Add Topia to your Home Screen
          </button>
          <button onClick={dismissInstall} aria-label="Dismiss" className="bg-transparent border-none cursor-pointer text-[15px] leading-none p-0 shrink-0" style={{ color: '#1a1a1a', opacity: 0.55 }}>×</button>
        </div>
      )}

      <AddToHomeScreenSheet open={installSheetOpen} onClose={closeInstallSheet} />
      {/* Bigger + higher-contrast than a default glass bar: 56px targets,
          80% glass, an ink-mixed hairline and a two-layer shadow so the
          pill reads as THE control surface, not background chrome. */}
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border p-2 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--page-bg) 80%, transparent)',
          borderColor: 'color-mix(in srgb, var(--page-text) 16%, transparent)',
          boxShadow: '0 16px 44px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.28)',
        }}
      >
        <Link href="/" aria-label="Home" aria-current={isActive('/') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/'))}>
          <TopiaMark width={31} />
        </Link>

        <Link href="/events" aria-label="Events" aria-current={isActive('/events') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/events'))}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </Link>

        <button onClick={onOpenMessages} aria-label={messagesBadge > 0 ? `Messages, ${messagesBadge} unread` : 'Messages'} className={itemCls} style={itemStyle(false)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          {messagesBadge > 0 && dot}
        </button>

        <Link href="/search" aria-label="Search" aria-current={isActive('/search') ? 'page' : undefined} className={itemCls} style={itemStyle(isActive('/search'))}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>

        {/* Your Topia card + connect QR — the thing you flash at a door or
            trade with someone you just met, one tap from anywhere */}
        {authenticated && (
          <button onClick={onOpenCard} aria-label="Your Topia card" className={itemCls} style={itemStyle(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3z" />
              <path d="M18 18h3v3h-3z" />
            </svg>
          </button>
        )}

        <button onClick={onMenuToggle} aria-label="Menu" className={itemCls} style={itemStyle(false)}>
          {authenticated && profile?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-[30px] h-[30px] rounded-full object-cover" />
          ) : authenticated ? (
            <span
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-mono text-[12px] font-bold"
              style={{ backgroundColor: 'var(--page-text)', color: 'var(--page-bg)' }}
            >
              {initial}
            </span>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}
