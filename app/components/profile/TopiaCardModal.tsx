'use client';

import { useState } from 'react';
import TopiaCard, { type TopiaCardProps } from './TopiaCard';

interface Props extends TopiaCardProps {
  open: boolean;
  onClose: () => void;
}

// Focused "your Topia card" sheet: the interactive 3D card + a save-image action
// (downloads the static PNG from /api/profile/<username>/card to share on socials).
export default function TopiaCardModal({ open, onClose, ...card }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
        <TopiaCard {...card} />

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="font-mono text-[12px] uppercase tracking-[2px] font-bold bg-lime text-obsidian px-5 py-2.5 rounded-md disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer border-none"
          >
            {saving ? 'saving…' : saved ? 'saved ✓' : 'save image'}
          </button>
          <button
            onClick={onClose}
            className="font-mono text-[12px] uppercase tracking-[2px] text-bone/60 hover:text-bone border border-bone/20 hover:border-bone/50 px-5 py-2.5 rounded-md transition-colors cursor-pointer bg-transparent"
          >
            close
          </button>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/35">move it — then save to share</p>
      </div>
    </div>
  );
}
