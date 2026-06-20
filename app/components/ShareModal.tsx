'use client';

import { useEffect, useState } from 'react';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;             // the (short) link to share
  title?: string;          // email subject / share lead
  text?: string;           // tweet / message lead
  /** When set (events), reveals the "Instagram Story" option. */
  storyImageUrl?: string;
  storyFilename?: string;
}

// Custom share sheet — replaces the OS native share. Shows the short link with
// a one-tap copy, plus Email / X / WhatsApp / Facebook targets, and (for events)
// an assisted "Instagram Story" flow that saves the event graphic + copies the
// link so the user can drop it into their story.
export default function ShareModal({ open, onClose, url, title, text, storyImageUrl, storyFilename }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [igState, setIgState] = useState<'idle' | 'working' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => { if (open) { setCopied(false); setIgState('idle'); } }, [open]);

  if (!open) return null;

  const shareText = text || title || 'Check this out on TOPIA';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const targets = [
    { key: 'email', label: 'Email', href: `mailto:?subject=${encodeURIComponent(title || 'TOPIA')}&body=${encodeURIComponent(`${shareText}\n\n${url}`)}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}` },
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];

  const handleInstagramStory = async () => {
    if (!storyImageUrl) return;
    setIgState('working');
    // Copy the link inside the click gesture so the clipboard write is allowed.
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    try {
      const res = await fetch(storyImageUrl);
      if (!res.ok) throw new Error('image fetch failed');
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = storyFilename || 'topia-story.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 4000);
      setIgState('ready');
    } catch {
      setIgState('error');
    }
  };

  const openInstagram = () => {
    // Deep-link to the story camera on mobile; fall back to the web app.
    window.location.href = 'instagram://story-camera';
    setTimeout(() => { window.open('https://instagram.com', '_blank'); }, 700);
  };

  const primaryBtn = 'font-mono text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-lg cursor-pointer border-none';
  const outlineBtn = 'font-mono text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-lg cursor-pointer border hover:opacity-70 transition bg-transparent';

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <span className="font-mono text-[12px] uppercase tracking-[2px]">Share</span>
          <button onClick={onClose} aria-label="Close" className="font-mono text-[18px] leading-none opacity-50 hover:opacity-100 transition bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }}>×</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Copy link */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[2px] opacity-40 block mb-1.5">Link</span>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 font-mono text-[12px] px-3 py-2 rounded-lg border bg-transparent outline-none"
                style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
              />
              <button onClick={copyLink} className={`shrink-0 ${primaryBtn}`} style={{ backgroundColor: 'var(--accent, #e4fe52)', color: 'var(--accent-text, #0a0a0a)' }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Share targets */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[2px] opacity-40 block mb-1.5">Share to</span>
            <div className="grid grid-cols-2 gap-2">
              {targets.map((t) => (
                <a key={t.key} href={t.href} target="_blank" rel="noopener noreferrer" className={`text-center no-underline ${outlineBtn}`} style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                  {t.label}
                </a>
              ))}
            </div>
          </div>

          {/* Instagram Story (events only) */}
          {storyImageUrl && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[2px] opacity-40 block mb-1.5">Instagram Story</span>
              {igState === 'ready' ? (
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[10px] leading-relaxed opacity-70">
                    Graphic saved &amp; link copied. Open Instagram → add the image to your Story → paste the link sticker.
                  </p>
                  <button onClick={openInstagram} className={primaryBtn} style={{ backgroundColor: 'var(--accent, #e4fe52)', color: 'var(--accent-text, #0a0a0a)' }}>
                    Open Instagram
                  </button>
                </div>
              ) : (
                <button onClick={handleInstagramStory} disabled={igState === 'working'} className={`w-full ${outlineBtn} disabled:opacity-50`} style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                  {igState === 'working' ? 'Preparing…' : igState === 'error' ? 'Try again' : 'Save graphic + copy link'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
