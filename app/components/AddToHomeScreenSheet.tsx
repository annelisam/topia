'use client';

import { useEffect, useState } from 'react';

/* The add-to-home-screen sheet — a deliberate, branded bottom sheet (obsidian
 * + lime, same committed look as Event Mode) that actually explains WHAT the
 * user gets and HOW to do it on their device:
 *   - Android Chrome: a real one-tap Install button via beforeinstallprompt
 *     (captured at module load — the event fires early), with manual steps
 *     as fallback.
 *   - iOS Safari: there is no API — illustrated share-menu steps instead.
 * Callers own open/close + persistence so the global nav and Event Mode can
 * run separate frequency rules. */

// Must be registered before the user ever opens the sheet — Chrome fires it
// once, shortly after load.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredInstall: InstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
  });
}

const LIME = '#e4fe52';
const INK = '#f5f0e8';
const DIM = 'rgba(245,240,232,0.6)';

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><rect x="4" y="11" width="16" height="10" rx="2" />
    </svg>
  );
}

export default function AddToHomeScreenSheet({
  open, onClose, variant = 'default', eventName,
}: {
  open: boolean;
  onClose: () => void;
  variant?: 'default' | 'event';
  eventName?: string | null;
}) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const nativeInstall = async () => {
    if (!deferredInstall) return;
    setInstalling(true);
    try {
      await deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      onClose();
    } catch { /* user dismissed the native prompt */ }
    finally { setInstalling(false); }
  };

  const step = (n: number, body: React.ReactNode) => (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0" style={{ backgroundColor: LIME, color: '#1a1a1a' }}>{n}</span>
      <span className="text-[13px] leading-relaxed" style={{ color: INK }}>{body}</span>
    </li>
  );

  return (
    <div
      // pointer-events-auto: the nav mounts this inside a pointer-events-none container
      className="fixed inset-0 z-[2400] flex items-end sm:items-center justify-center pointer-events-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add Topia to your Home Screen"
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(228,254,82,0.35)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: LIME }}>
            {variant === 'event' ? 'Event mode · pro move' : 'Topia · like an app'}
          </p>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0" style={{ color: DIM }}>×</button>
        </div>

        <h2 className="heading-display uppercase mt-2" style={{ color: INK, fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          Put Topia on your Home&nbsp;Screen
        </h2>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: DIM }}>
          {variant === 'event'
            ? `Your pass, quests, and the people you meet${eventName ? ` at ${eventName}` : ' tonight'} — one tap away all night, full screen, no browser bars.`
            : 'Topia opens full-screen like an app — one tap to your passport, events, and messages. No app store, takes ten seconds.'}
        </p>

        {platform === 'android' && deferredInstall ? (
          <button
            onClick={nativeInstall}
            disabled={installing}
            className="w-full mt-5 font-mono text-[13px] font-bold uppercase tracking-widest px-4 py-3.5 rounded-full cursor-pointer border-none disabled:opacity-50"
            style={{ backgroundColor: LIME, color: '#1a1a1a' }}
          >
            {installing ? 'Opening…' : '⊕ Install Topia'}
          </button>
        ) : (
          <ol className="flex flex-col gap-3 mt-5 list-none p-0 m-0">
            {platform === 'android' ? (
              <>
                {step(1, <>Tap the <b>⋮ menu</b> in the top corner of Chrome</>)}
                {step(2, <>Tap <b>&quot;Add to Home screen&quot;</b></>)}
                {step(3, <>Tap <b>Add</b> — that&apos;s it</>)}
              </>
            ) : (
              <>
                {step(1, <span className="inline-flex items-center gap-1.5 flex-wrap">Tap the <b>Share</b> button <ShareIcon /> in Safari&apos;s toolbar</span>)}
                {step(2, <>Scroll down and tap <b>&quot;Add to Home Screen&quot;</b></>)}
                {step(3, <>Tap <b>Add</b> — Topia appears with your apps</>)}
              </>
            )}
          </ol>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 font-mono text-[11px] font-bold uppercase tracking-widest px-4 py-3 rounded-full cursor-pointer bg-transparent"
          style={{ border: '1px solid rgba(245,240,232,0.25)', color: DIM }}
        >
          {platform === 'android' && deferredInstall ? 'Maybe later' : 'Got it'}
        </button>
      </div>
    </div>
  );
}
