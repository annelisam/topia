// Canonical catalog of role tags ("craft") a member can claim on their profile.
// Shared by onboarding (RoleTagsStep) and the post-RSVP profile-completion form
// so the two never drift apart.
export const ROLE_TAGS = [
  { slug: 'music', label: 'Music' },
  { slug: 'dj', label: 'DJ' },
  { slug: 'visual-artist', label: 'Visual Artist' },
  { slug: 'filmmaker', label: 'Filmmaker' },
  { slug: 'photographer', label: 'Photographer' },
  { slug: 'writer', label: 'Writer' },
  { slug: 'poet', label: 'Poet' },
  { slug: 'dancer', label: 'Dancer' },
  { slug: 'performer', label: 'Performer' },
  { slug: 'producer', label: 'Producer' },
  { slug: 'designer', label: 'Designer' },
  { slug: 'illustrator', label: 'Illustrator' },
  { slug: 'game-designer', label: 'Game Designer' },
  { slug: 'architect', label: 'Architect' },
  { slug: 'technologist', label: 'Technologist' },
  { slug: 'curator', label: 'Curator' },
  { slug: 'educator', label: 'Educator' },
  { slug: 'community-builder', label: 'Community Builder' },
  { slug: 'entrepreneur', label: 'Entrepreneur' },
  { slug: 'researcher', label: 'Researcher' },
] as const;

const LABEL_BY_SLUG = new Map<string, string>(ROLE_TAGS.map((r) => [r.slug, r.label]));
const SLUG_BY_LABEL = new Map<string, string>(ROLE_TAGS.map((r) => [r.label.toLowerCase(), r.slug]));

// Turn a free-typed role label into a storage-safe slug ("3D Artist" → "3d-artist").
export function slugifyRole(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// profile stores role tags as slugs; the event "What do you do?" picker uses
// human labels. These convert between the two so the two surfaces stay in sync.
export function roleSlugToLabel(slug: string): string {
  return (
    LABEL_BY_SLUG.get(slug) ??
    slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
}

export function roleLabelToSlug(label: string): string {
  return SLUG_BY_LABEL.get(label.trim().toLowerCase()) ?? slugifyRole(label);
}
