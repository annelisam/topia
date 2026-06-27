// Decoupled trigger for the global Messages modal (mounted in Navigation).
// Any client component can call openMessagesModal() to pop it open — optionally
// deep-linked to a conversation.
export const OPEN_MESSAGES_EVENT = 'topia:open-messages';

export function openMessagesModal(conversationId?: string | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_MESSAGES_EVENT, { detail: { conversationId: conversationId ?? null } }));
}
