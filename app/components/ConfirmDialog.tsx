'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Branded replacement for window.confirm. Render conditionally:
 *   {confirming && <ConfirmDialog title="Delete this comment?" destructive
 *     onConfirm={...} onCancel={() => setConfirming(false)} />}
 * Escape / backdrop click cancel. Destructive confirms use orange.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center px-6 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.7)' }}
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm bg-obsidian text-bone border border-bone/[0.1] rounded-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[13px] font-bold leading-snug mb-1.5">{title}</p>
        {body && <p className="font-mono text-[12px] text-bone/60 leading-relaxed mb-4">{body}</p>}
        <div className={`flex items-center justify-end gap-2 ${body ? '' : 'mt-4'}`}>
          <button
            onClick={onCancel}
            className="font-mono text-[11px] uppercase tracking-[2px] px-4 py-2.5 rounded-sm border border-bone/20 text-bone/70 hover:text-bone bg-transparent cursor-pointer transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="font-mono text-[11px] uppercase tracking-[2px] font-bold px-4 py-2.5 rounded-sm border-none cursor-pointer hover:opacity-85 transition"
            style={destructive ? { backgroundColor: 'var(--orange, #FF5C34)', color: '#fff' } : { backgroundColor: 'var(--lime, #e4fe52)', color: '#1a1a1a' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
