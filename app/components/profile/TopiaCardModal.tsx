'use client';

import { useEffect, useState } from 'react';
import TopiaCard, { type TopiaCardProps } from './TopiaCard';

interface Props extends TopiaCardProps {
  open: boolean;
  onClose: () => void;
}

// Focused "your Topia card" sheet: the interactive 3D card + a save-image action
// (downloads the static PNG from /api/profile/<username>/card to share on socials).
// Closes on the X, Esc, or clicking outside the card.
export default function TopiaCardModal({ open, onClose, ...card }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(card.username)}/card`);
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${card.username}-topia-card.png`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[2200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Close — X, top-right (works on mobile + desktop) */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="fixed top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full text-bone/60 hover:text-bone hover:bg-bone/10 transition-colors cursor-pointer bg-transparent border-none"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex flex-col items-center gap-5" onClick={(e) => e.stopPropagation()}>
        <TopiaCard {...card} />

        {/* Minimal save action — icon button */}
        <button
          onClick={save}
          disabled={saving}
          aria-label={saved ? 'Saved' : 'Save image'}
          title={saved ? 'Saved' : 'Save image'}
          className="w-11 h-11 flex items-center justify-center rounded-full border border-bone/20 text-bone/70 hover:text-lime hover:border-lime/60 transition-colors cursor-pointer bg-transparent disabled:opacity-50"
        >
          {saving ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.2-8.5" />
            </svg>
          ) : saved ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M5 21h14" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
