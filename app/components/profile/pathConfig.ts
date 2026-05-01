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
