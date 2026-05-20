'use client';

import Link from 'next/link';
import { PATH_CONFIG, UserPath } from '../../components/profile/pathConfig';

interface Props {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  path: UserPath | '';
  roleTags: string[];
  pronouns?: string;
  customLinks?: { label: string; url: string }[];
}

/**
 * Mini passport preview that mirrors what the public /profile/[username]
 * page will look like. Reflects the user's current edits in real time.
 */
export default function ProfilePreviewCard({ name, username, bio, avatarUrl, path, roleTags, pronouns, customLinks }: Props) {
  const config = path ? PATH_CONFIG[path] : PATH_CONFIG.anchor; // default visual until path picked
  const accent = config.hex;
  const accentTextOn = config.textOn;

  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden bg-obsidian">
      {/* Accent strip */}
      <div className={`px-3 py-1.5 flex items-center justify-between ${config.bg}`}>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${accentTextOn} opacity-60`}>preview · public</span>
        {username && (
          <Link
            href={`/profile/${username}`}
            target="_blank"
            className={`font-mono text-[9px] uppercase tracking-[2px] ${accentTextOn} opacity-80 hover:opacity-100 no-underline`}
          >
            open ↗
          </Link>
        )}
      </div>

      {/* Photo + name */}
      <div className="p-4 flex items-center gap-3">
        <div className="relative shrink-0">
          {/* Corner ticks */}
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5"><span className="absolute top-0 left-0 w-full h-[1px] bg-bone/30" /><span className="absolute top-0 left-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5"><span className="absolute top-0 right-0 w-full h-[1px] bg-bone/30" /><span className="absolute top-0 right-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5"><span className="absolute bottom-0 left-0 w-full h-[1px] bg-bone/30" /><span className="absolute bottom-0 left-0 h-full w-[1px] bg-bone/30" /></span>
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5"><span className="absolute bottom-0 right-0 w-full h-[1px] bg-bone/30" /><span className="absolute bottom-0 right-0 h-full w-[1px] bg-bone/30" /></span>
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-bone/20">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bone/5">
                <span className="font-basement text-xl text-bone/30">{(name || username || '?')[0]?.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="font-basement text-[18px] uppercase leading-none text-bone truncate">
              {name || (username ? `@${username}` : 'YOUR NAME')}
            </div>
            {pronouns && (
              <span className="font-mono text-[9px] lowercase tracking-wider text-bone/40">({pronouns})</span>
            )}
          </div>
          {username && <div className="font-mono text-[10px] text-bone/40 mt-0.5">@{username}</div>}
          {path && (
            <div className="inline-block mt-1 font-mono text-[9px] uppercase tracking-[2px] px-1.5 py-0.5" style={{ backgroundColor: accent, color: config.textOn === 'text-obsidian' ? '#1a1a1a' : '#f5f0e8' }}>
              {config.label}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {bio && (
        <div className="px-4 pb-3">
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25 block">declaration</span>
          <p className="font-zirkon italic text-[12px] text-bone/60 leading-relaxed mt-0.5 line-clamp-3">&ldquo;{bio}&rdquo;</p>
        </div>
      )}

      {/* Role tags */}
      {roleTags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {roleTags.slice(0, 6).map((r) => (
            <span key={r} className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-bone/15 text-bone/50 rounded-sm">
              {r.replace(/-/g, ' ')}
            </span>
          ))}
          {roleTags.length > 6 && (
            <span className="font-mono text-[9px] text-bone/30">+{roleTags.length - 6}</span>
          )}
        </div>
      )}

      {/* Custom links */}
      {customLinks && customLinks.filter((l) => l?.label && l?.url).length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">
          {customLinks.filter((l) => l?.label && l?.url).slice(0, 6).map((cl, i) => (
            <span key={i} className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-bone/15 text-bone/60 rounded-sm">
              {cl.label}
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!name && !bio && roleTags.length === 0 && (
        <div className="px-4 pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-bone/25">
            fill out your profile to see it come to life
          </p>
        </div>
      )}
    </div>
  );
}
