export type UserPath = 'worldbuilder' | 'catalyst' | 'anchor';

export interface PathConfig {
  label: string;
  color: string;
  hex: string;
  bg: string;
  textOn: string;
}

export const PATH_CONFIG: Record<UserPath, PathConfig> = {
  worldbuilder: { label: 'WORLDBUILDER', color: 'lime',  hex: '#e4fe52', bg: 'bg-lime', textOn: 'text-obsidian' },
  catalyst:     { label: 'CATALYST',     color: 'blue',  hex: '#4F46FF', bg: 'bg-blue', textOn: 'text-bone' },
  anchor:       { label: 'ANCHOR',       color: 'pink',  hex: '#FF5BD7', bg: 'bg-pink', textOn: 'text-bone' },
};

export const COLOR_HEX: Record<string, string> = {
  lime: '#e4fe52',
  blue: '#4F46FF',
  pink: '#FF5BD7',
  orange: '#FF5C34',
  green: '#00FF88',
};

export function derivePath(roleTags: string[], hasOwnedWorlds: boolean): UserPath {
  if (hasOwnedWorlds) return 'worldbuilder';
  const catalystRoles = ['designer', 'illustrator', 'technologist', 'producer', 'photographer', 'filmmaker', 'visual-artist', 'game-designer', 'architect'];
  if (roleTags.some((r) => catalystRoles.includes(r))) return 'catalyst';
  return 'anchor';
}

/**
 * Resolve the user's path: prefer the explicit DB column, else derive from
 * roleTags + world membership signals.
 */
export function resolvePath(
  explicitPath: string | null | undefined,
  roleTags: string[],
  hasOwnedWorlds: boolean,
): UserPath {
  if (explicitPath === 'worldbuilder' || explicitPath === 'catalyst' || explicitPath === 'anchor') {
    return explicitPath;
  }
  return derivePath(roleTags, hasOwnedWorlds);
}

/** Default role-tag seeds keyed by path — used to pre-check role step in onboarding. */
export const PATH_DEFAULT_ROLES: Record<UserPath, string[]> = {
  worldbuilder: ['community-builder', 'curator', 'entrepreneur'],
  catalyst:     ['designer', 'producer', 'technologist'],
  anchor:       ['curator', 'community-builder'],
};
