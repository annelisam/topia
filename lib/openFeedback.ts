// Decoupled trigger for the global feedback drawer (mounted in layout.tsx).
// Mirrors lib/openMessages.ts: any client component can pop the drawer —
// e.g. the "share feedback" button inside the /home welcome popup.
export const OPEN_FEEDBACK_EVENT = 'topia:open-feedback';

export function openFeedbackWidget() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT));
}
