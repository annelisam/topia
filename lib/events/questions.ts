// Shared registration-question primitives used by both the event composer
// (create/edit) and the Manage › Registration tab. The two surfaces render
// their own UIs (different styling + persistence semantics), but the question
// type catalog, the select-type set, and answer formatting must stay identical
// across them — so they live here.

export const QUESTION_TYPES: { value: string; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'single_select', label: 'Single choice' },
  { value: 'multi_select', label: 'Multiple choice' },
  { value: 'checkbox', label: 'Checkbox' },
];

// Types that require a list of options.
export const SELECT_TYPES = new Set(['single_select', 'multi_select']);

export type AnswerValue = string | string[] | boolean | null;

// Human-readable rendering of a stored answer for guest lists / CSV export.
export function answerToText(a: AnswerValue): string {
  if (a == null) return '—';
  if (a === true) return 'Yes';
  if (a === false) return 'No';
  if (Array.isArray(a)) return a.join(', ');
  return String(a);
}

// Label lookup for a question type value.
export function questionTypeLabel(value: string): string {
  return QUESTION_TYPES.find((t) => t.value === value)?.label ?? value;
}
