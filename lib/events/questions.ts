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
  { value: 'roles', label: 'Roles / what you do (tags)' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X (Twitter)' },
];

// Types that carry a list of options (single/multi choice + the roles picker).
export const SELECT_TYPES = new Set(['single_select', 'multi_select', 'roles']);

// Social-handle field types — rendered with a platform icon + @ prefix.
export const SOCIAL_TYPES = new Set(['instagram', 'twitter']);

// Max tags a guest can pick for a "roles" question.
export const ROLES_MAX = 3;

// Default suggestions for the "What do you do?" roles picker. Guests search
// these, pick up to ROLES_MAX, and can create their own if missing. Kept broad
// so most creators / builders find themselves. (Base 20 mirror the profile
// creator; the rest fill out adjacent disciplines.)
export const ROLE_TAGS = [
  // Profile-creator base
  'Music', 'DJ', 'Visual Artist', 'Filmmaker', 'Photographer', 'Writer', 'Poet',
  'Dancer', 'Performer', 'Producer', 'Designer', 'Illustrator', 'Game Designer',
  'Architect', 'Technologist', 'Curator', 'Educator', 'Community Builder',
  'Entrepreneur', 'Researcher',
  // Music & audio
  'Musician', 'Singer', 'Songwriter', 'Rapper', 'Composer', 'Sound Designer',
  'Audio Engineer', 'Vocalist', 'Beatmaker',
  // Visual art
  'Painter', 'Digital Artist', '3D Artist', 'Animator', 'Sculptor', 'Muralist',
  'Tattoo Artist', 'Printmaker', 'Street Artist', 'Graphic Designer',
  // Film, photo & video
  'Director', 'Cinematographer', 'Videographer', 'Video Editor', 'Documentarian',
  'Content Creator', 'Editor',
  // Design
  'Product Designer', 'UX Designer', 'UI Designer', 'Fashion Designer',
  'Industrial Designer', 'Interior Designer', 'Set Designer', 'Type Designer',
  'Creative Director', 'Art Director',
  // Writing & words
  'Author', 'Journalist', 'Screenwriter', 'Copywriter', 'Critic', 'Blogger',
  // Performance
  'Choreographer', 'Actor', 'Comedian', 'Theater Artist', 'Model',
  // Tech & engineering
  'Developer', 'Software Engineer', 'Engineer', 'Data Scientist',
  'AI / ML Engineer', 'Robotics', 'Game Developer',
  // Web3 & crypto
  'Web3 Builder', 'Smart Contract Developer', 'NFT Artist', 'DAO Contributor',
  'Trader', 'Founder', 'Investor', 'VC',
  // Business & community
  'Organizer', 'Gallerist', 'Marketer', 'Brand Strategist', 'Manager',
  'Consultant', 'Advisor',
  // Knowledge & craft
  'Scientist', 'Student', 'Chef', 'Stylist', 'Maker', 'Activist',
];

// Auto-filled labels when a host picks one of these question types.
export const DEFAULT_LABELS: Record<string, string> = {
  instagram: 'What is your Instagram?',
  twitter: 'What is your X?',
  roles: 'What do you do?',
};

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
