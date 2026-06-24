import { COLOR_HEX } from '../profile/pathConfig';

/**
 * World theming — the worlds equivalent of profile's pathConfig. Worlds have no
 * semantic "path", so we derive a STABLE color from the slug (the worlds list
 * uses an index-based cycle; a slug hash gives each world a consistent color no
 * matter where it appears). Mirrors PathConfig's shape so the dossier can drive
 * accent strips, tabs, and stat rails the same way the passport does.
 */
export interface WorldConfig {
  color: string;
  hex: string;
  bg: string;
  textOn: string;
}

const CYCLE = ['lime', 'blue', 'pink', 'orange', 'green'] as const;
const BG: Record<string, string> = { lime: 'bg-lime', blue: 'bg-blue', pink: 'bg-pink', orange: 'bg-orange', green: 'bg-green' };
// Light foreground colors read on lime/green; dark text reads on blue/pink/orange.
const TEXT_ON: Record<string, string> = { lime: 'text-obsidian', green: 'text-obsidian', blue: 'text-bone', pink: 'text-bone', orange: 'text-bone' };

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getWorldConfig(slug: string | null | undefined): WorldConfig {
  const color = CYCLE[slug ? hash(slug) % CYCLE.length : 0];
  return { color, hex: COLOR_HEX[color], bg: BG[color], textOn: TEXT_ON[color] };
}
