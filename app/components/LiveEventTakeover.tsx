'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLiveEvent, localDate } from '../hooks/useLiveEvent';

/* The live-event takeover: the first time someone opens Topia on a day an
 * event is happening, this announces it full-screen — once per event per day,
 * on every surface (desktop included, which has no FrostedPill chip). The CTA
 * matches where the viewer stands: already in (Event Mode) vs. not on the
 * list yet (straight into the RSVP flow via /events/<slug>?rsvp=1). */

const INK = '#f5f0e8';
const LIME = '#e4fe52';
const ORANGE = '#FF5C34';
const DIM = 'rgba(245,240,232,0.55)';

const seenKey = (slug: string) => `topia:live-takeover:${slug}:${localDate()}`;

export default function LiveEventTakeover() {
  const pathname = usePathname();
  const { ready, user } = usePrivy();
  const live = useLiveEvent(user?.id, ready);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Never interrupt flows where the event is already on screen or the viewer
  // is mid-task (onboarding, QR connect handshakes, admin).
  const suppressed =
    !live ||
    pathname.startsWith(`/events/${live.slug}`) ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/connect') ||
    pathname.startsWith('/admin');

  useEffect(() => {
    if (!ready || suppressed || !live || open) return;
    try { if (localStorage.getItem(seenKey(live.slug))) return; } catch { return; }
    const t = setTimeout(() => {
      setOpen(true);
      // Tell other one-time popups (add-to-home-screen sheet) to stand down
      // this session — one takeover at a time.
      try { sessionStorage.setItem('topia:live-takeover-shown', '1'); } catch { /* private mode */ }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, suppressed, live?.slug]);

  const close = () => {
    if (live) { try { localStorage.setItem(seenKey(live.slug), '1'); } catch { /* private mode */ } }
    setLeaving(true);
    setTimeout(() => { setOpen(false); setLeaving(false); }, 220);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !live || suppressed) return null;

  const involved = live.involvement !== 'none';
  const metaLine = [live.startTime, live.city, live.goingCount > 0 ? `${live.goingCount} going` : null]
    .filter(Boolean).join(' · ');

  const badge = live.involvement === 'checkedin' ? "You're checked in"
    : live.involvement === 'host' ? "You're hosting tonight"
    : live.involvement === 'going' ? "You're on the list"
    : 'Happening today';

  const body = live.involvement === 'checkedin'
    ? 'Your pass, tonight’s quests, and everyone in the room — one tap away.'
    : live.involvement === 'host'
    ? 'Door check-in, quests and prizes are ready in Event Mode.'
    : live.involvement === 'going'
    ? 'Event Mode has your entry pass for the door, tonight’s quests, and the room.'
    : 'You’re not on the list yet — there’s still time. RSVP takes about a minute.';

  const btnBase = 'block w-full text-center font-mono text-[12px] font-bold uppercase tracking-[0.14em] px-5 py-3.5 rounded-full no-underline cursor-pointer transition-transform duration-150 active:scale-[0.98]';

  return (
    <div
      className={`fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4 takeover-backdrop${leaving ? ' takeover-leaving' : ''}`}
      style={{ backgroundColor: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label={`Live today: ${live.eventName}`}
    >
      <div
        className="takeover-card relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255,92,52,0.45)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,92,52,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft orange bloom behind the header so LIVE reads as an event,
            not an error */}
        <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(255,92,52,0.28), transparent)' }} />

        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute top-3.5 right-4 z-10 bg-transparent border-none cursor-pointer text-[20px] leading-none p-1"
          style={{ color: DIM }}
        >
          ×
        </button>

        <div className="relative px-6 pt-7 pb-6 flex flex-col gap-4">
          {/* ● LIVE with radar ping */}
          <div className="takeover-stagger flex items-center gap-2.5" style={{ '--d': '80ms' } as React.CSSProperties}>
            <span className="relative flex w-3 h-3">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: ORANGE }} />
              <span className="live-ping live-ping-late absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: ORANGE }} />
              <span className="relative inline-flex rounded-full w-3 h-3" style={{ backgroundColor: ORANGE }} />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
              Live · {badge}
            </span>
          </div>

          <div className="takeover-stagger" style={{ '--d': '160ms' } as React.CSSProperties}>
            <h2
              className="heading-display uppercase"
              style={{ color: INK, fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.04, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              {live.eventName}
            </h2>
            {metaLine && (
              <p className="font-mono text-[11px] uppercase tracking-widest mt-2" style={{ color: DIM }}>{metaLine}</p>
            )}
          </div>

          <p className="takeover-stagger text-[13px] leading-relaxed" style={{ color: INK, '--d': '240ms' } as React.CSSProperties}>
            {body}
          </p>

          <div className="takeover-stagger flex flex-col gap-2.5" style={{ '--d': '320ms' } as React.CSSProperties}>
            {involved ? (
              <Link href={`/events/${live.slug}/live`} onClick={close} className={`${btnBase} takeover-cta`} style={{ backgroundColor: LIME, color: '#1a1a1a' }}>
                {live.involvement === 'host' ? 'Open host tools →' : live.involvement === 'checkedin' ? 'Back into Event Mode →' : 'Enter Event Mode →'}
              </Link>
            ) : (
              <>
                <Link href={`/events/${live.slug}?rsvp=1&from=live`} onClick={close} className={`${btnBase} takeover-cta`} style={{ backgroundColor: LIME, color: '#1a1a1a' }}>
                  RSVP now →
                </Link>
                <Link href={`/events/${live.slug}/live`} onClick={close} className={btnBase} style={{ backgroundColor: 'transparent', color: INK, border: '1px solid rgba(245,240,232,0.25)' }}>
                  Peek inside Event Mode
                </Link>
              </>
            )}
            <button onClick={close} className="bg-transparent border-none cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] py-1" style={{ color: DIM }}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
