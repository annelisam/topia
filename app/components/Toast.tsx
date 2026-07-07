'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Minimal global toast system. Usage:
 *   const toast = useToast();
 *   toast.error('Could not save — try again.');
 *   toast.success('Saved.');
 *
 * Renders through a portal (lvh-safe, above modals), auto-dismisses after 5s,
 * announces politely to screen readers. Styling follows the house tokens:
 * obsidian card, lime accent for success, orange for errors.
 */

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let _toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const push = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-20 md:bottom-6 z-[10500] flex flex-col items-center md:items-end gap-2 px-4 md:px-6 pointer-events-none"
            role="status"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto max-w-sm w-full md:w-auto bg-obsidian text-bone border rounded-lg px-4 py-3 shadow-lg flex items-start gap-3"
                style={{ borderColor: t.kind === 'error' ? 'rgba(255,92,52,0.5)' : 'rgba(228,254,82,0.4)', animation: 'toastIn 0.25s ease-out' }}
              >
                <span
                  className="mt-1 w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.kind === 'error' ? 'var(--orange, #FF5C34)' : 'var(--lime, #e4fe52)' }}
                />
                <span className="font-mono text-[12px] leading-snug flex-1">{t.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  aria-label="Dismiss"
                  className="font-mono text-[14px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** No-op fallback so components stay safe if a provider is ever missing. */
const NOOP: ToastApi = { success: () => {}, error: () => {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}
