'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PageShell from '../components/PageShell';
import BlobImage from '../components/BlobImage';
import { PATH_CONFIG, type UserPath } from '../components/profile/pathConfig';

export interface TopianProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  roleTags: string | null;
  path: string | null;
  bio: string | null;
  pronouns: string | null;
  isWorldBuilder?: boolean;
  createdAt?: string;
}

const txt = { color: 'var(--foreground)' } as const;
const BADGE_BASE = 'inline-flex items-center font-mono text-[8px] uppercase tracking-[1.5px] leading-none px-1.5 py-1 rounded-sm font-bold';

// New if the profile was created within the last 21 days.
function isNewProfile(createdAt?: string): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return !isNaN(t) && Date.now() - t < 21 * 24 * 60 * 60 * 1000;
}

function PathBadge({ path }: { path: string | null }) {
  if (!path || !(path in PATH_CONFIG)) return null;
  const c = PATH_CONFIG[path as UserPath];
  return <span className={`absolute top-2.5 left-2.5 ${BADGE_BASE} ${c.bg} ${c.textOn}`}>{c.label}</span>;
}

// /topians — the full TOPIA directory. Every published profile, searchable
// and filterable by what people do. The home Discover carousel links here.
// The directory is server-rendered (see page.tsx); search/filter run client-side.
export default function TopiansClient({ initialProfiles }: { initialProfiles: TopianProfile[] }) {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string>('all');
  const profiles = initialProfiles;

  // The most common role tags across the directory become the filter chips.
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of profiles) {
      for (const t of (p.roleTags ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (tag !== 'all') {
        const tags = (p.roleTags ?? '').split(',').map((s) => s.trim().toLowerCase());
        if (!tags.includes(tag.toLowerCase())) return false;
      }
      if (!q) return true;
      return (p.name ?? '').toLowerCase().includes(q) || (p.username ?? '').toLowerCase().includes(q);
    });
  }, [profiles, search, tag]);

  return (
    <PageShell>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-10 md:py-14">
          {/* Header */}
          <div className="mb-8">
            <span className="font-mono text-[11px] uppercase tracking-[3px] opacity-40 block mb-1" style={txt}>the community</span>
            <h1 className="font-basement font-black text-[clamp(34px,6vw,64px)] leading-[0.9] uppercase" style={txt}>Topians</h1>
            <p className="font-mono text-[12px] opacity-50 mt-2 max-w-[520px]" style={txt}>
              Everyone building, shaping, and moving through TOPIA.
            </p>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-3 mb-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a name or @handle…"
              className="w-full max-w-[420px] bg-transparent border font-mono text-[13px] px-4 py-3 rounded-xl outline-none transition focus:border-[var(--foreground)]"
              style={{ ...txt, borderColor: 'var(--border-color)' }}
            />
            {topTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {['all', ...topTags].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={`font-mono text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-full border transition cursor-pointer ${
                      tag === t ? 'bg-lime text-obsidian border-lime font-bold' : 'bg-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={tag === t ? undefined : { ...txt, borderColor: 'var(--border-color)' }}
                  >
                    {t === 'all' ? 'All' : t.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Directory */}
          {filtered.length === 0 ? (
            <div className="border rounded-xl py-16 text-center font-mono text-[12px] uppercase tracking-[2px] opacity-30" style={{ ...txt, borderColor: 'var(--border-color)' }}>
              No Topians match — try another search
            </div>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[2px] opacity-30 mb-4" style={txt}>
                {filtered.length} {filtered.length === 1 ? 'Topian' : 'Topians'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((p, i) => {
                  const tags = (p.roleTags ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 2);
                  const initial = (p.name || p.username || '?')[0]?.toUpperCase();
                  return (
                    <Link key={p.id} href={`/profile/${p.username}`} className="group block rounded-xl overflow-hidden border bg-obsidian hover:border-lime transition-colors no-underline" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="aspect-[4/3] overflow-hidden bg-obsidian relative">
                        {p.avatarUrl ? (
                          // First row is above the fold — the LCP element lives
                          // here, so those load eagerly with high priority.
                          <BlobImage
                            src={p.avatarUrl}
                            alt={p.name ?? ''}
                            width={560}
                            height={420}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                            priority={i < 4}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-basement font-black text-[42px] text-bone/20">{initial}</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-obsidian to-transparent" />
                        {p.isWorldBuilder ? (
                          <span className={`absolute top-2.5 left-2.5 ${BADGE_BASE} bg-lime text-obsidian`}>World Builder</span>
                        ) : (
                          <PathBadge path={p.path} />
                        )}
                        {isNewProfile(p.createdAt) && (
                          <span className={`absolute top-2.5 right-2.5 ${BADGE_BASE} bg-pink text-obsidian`}>New</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-basement font-black text-[15px] uppercase text-bone truncate leading-tight">{p.name || `@${p.username}`}</h3>
                        <span className="font-mono text-[10px] text-bone/40 block truncate">@{p.username}</span>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((t) => (
                              <span key={t} className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-bone/15 text-bone/50 rounded-sm whitespace-nowrap">{t.replace(/-/g, ' ')}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
