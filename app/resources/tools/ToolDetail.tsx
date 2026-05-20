'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { faviconUrl } from './favicon';

export interface ToolDetailData {
  tool: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    description: string | null;
    pricing: string | null;
    url: string | null;
    featured: boolean | null;
  };
  users: { id: string; username: string | null; name: string | null; avatarUrl: string | null }[];
  worlds: { id: string; title: string; slug: string; category: string | null; imageUrl: string | null }[];
}

interface Props {
  data: ToolDetailData;
  /** When true, render with no max-height/scroll — for the full-page route. */
  fullPage?: boolean;
  /** Optional close handler for modal usage. */
  onClose?: () => void;
  /** Optional expand-to-page handler. */
  onExpand?: () => void;
}

function parseCategories(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map((c) => c.trim()).filter(Boolean);
}

export default function ToolDetail({ data, fullPage, onClose, onExpand }: Props) {
  const { tool, users, worlds } = data;
  const { authenticated, user } = usePrivy();
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const favicon = faviconUrl(tool.url, 128);
  const categories = parseCategories(tool.category);

  // Initial saved state
  useEffect(() => {
    if (!authenticated || !user?.id) return;
    fetch(`/api/tools/save?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then(({ savedToolSlugs }) => setSaved(Array.isArray(savedToolSlugs) && savedToolSlugs.includes(tool.slug)))
      .catch(console.error);
  }, [authenticated, user?.id, tool.slug]);

  async function toggleSave() {
    if (!authenticated || !user?.id || savePending) return;
    setSavePending(true);
    const wasSaved = saved;
    setSaved(!wasSaved); // optimistic
    try {
      const res = await fetch('/api/tools/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          slug: tool.slug,
          action: wasSaved ? 'unsave' : 'save',
        }),
      });
      const json = await res.json();
      setSaved(Boolean(json?.saved));
    } catch (err) {
      console.error('save toggle failed', err);
      setSaved(wasSaved); // revert
    } finally {
      setSavePending(false);
    }
  }

  return (
    <div className={`bg-obsidian text-bone ${fullPage ? '' : 'rounded-lg border border-bone/[0.08] overflow-hidden'}`}>
      {/* Top accent strip */}
      <div className="bg-lime px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">topia://tools</span>
        <div className="flex items-center gap-3">
          {onExpand && (
            <button
              onClick={onExpand}
              className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/70 hover:text-obsidian transition bg-transparent border-none cursor-pointer"
              title="Open in full page"
            >
              ⛶ expand
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="font-mono text-[14px] text-obsidian/70 hover:text-obsidian transition bg-transparent border-none cursor-pointer leading-none w-5 h-5 flex items-center justify-center"
              title="Close"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Header: favicon + name + categories + save */}
      <div className="px-5 md:px-7 py-5 md:py-6 border-b border-bone/[0.06] flex items-start gap-4 md:gap-5">
        <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-md border border-bone/15 overflow-hidden flex items-center justify-center bg-bone/[0.04]">
          {favicon ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={favicon} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="font-basement text-2xl text-bone/30">{tool.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-basement font-black text-[clamp(22px,3vw,32px)] uppercase leading-[0.95] text-bone">{tool.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {tool.pricing && (
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-bone/15 text-bone/60 rounded-sm">
                {tool.pricing}
              </span>
            )}
            {categories.map((cat) => (
              <span
                key={cat}
                className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-lime/30 text-lime/80 rounded-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {authenticated && (
            <button
              onClick={toggleSave}
              disabled={savePending}
              className={`font-mono text-[11px] uppercase tracking-[2px] px-3 py-1.5 rounded-sm border transition cursor-pointer ${
                saved
                  ? 'bg-lime border-lime text-obsidian'
                  : 'bg-transparent border-bone/30 text-bone/70 hover:border-bone/70 hover:text-bone'
              }`}
              title={saved ? 'Saved — click to remove' : 'Save to your dashboard'}
            >
              {savePending ? '…' : saved ? '★ saved' : '☆ save'}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`px-5 md:px-7 py-5 md:py-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 ${fullPage ? '' : 'max-h-[60vh] overflow-y-auto'}`}>
        {/* Left: description + visit */}
        <div className="md:col-span-2 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">about</span>
          {tool.description ? (
            <p className="font-zirkon text-[14px] text-bone/80 leading-relaxed">{tool.description}</p>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-wider text-bone/25">no description yet</p>
          )}

          {tool.url && (
            <div className="mt-5">
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] text-obsidian bg-lime hover:opacity-90 px-4 py-2 rounded-sm no-underline transition"
              >
                visit site →
              </a>
            </div>
          )}
        </div>

        {/* Right: stats */}
        <div className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">usage</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-bone/10 rounded-sm p-3">
              <div className="font-mono text-[22px] text-bone leading-none font-bold">{users.length}</div>
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 mt-1">creators</div>
            </div>
            <div className="border border-bone/10 rounded-sm p-3">
              <div className="font-mono text-[22px] text-bone leading-none font-bold">{worlds.length}</div>
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 mt-1">worlds</div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="md:col-span-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-3">creators using {tool.name}</span>
          {users.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-bone/25">no one yet — be the first</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {users.slice(0, 24).map((u) => (
                u.username ? (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-2 border border-bone/10 hover:border-bone/40 px-2.5 py-1.5 rounded-sm transition no-underline"
                  >
                    <span className="w-6 h-6 rounded-full overflow-hidden bg-bone/5 shrink-0 flex items-center justify-center">
                      {u.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-basement text-[10px] text-bone/50">{(u.name || u.username || '?')[0]?.toUpperCase()}</span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-bone/70">@{u.username}</span>
                  </Link>
                ) : null
              ))}
              {users.length > 24 && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-bone/30 self-center">+{users.length - 24} more</span>
              )}
            </div>
          )}
        </div>

        {/* Worlds */}
        <div className="md:col-span-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-3">worlds using {tool.name}</span>
          {worlds.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-wider text-bone/25">no worlds use this tool yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {worlds.slice(0, 9).map((w) => (
                <Link
                  key={w.id}
                  href={`/worlds/${w.slug}`}
                  className="flex items-center gap-3 border border-bone/10 hover:border-bone/40 px-3 py-2 rounded-sm transition no-underline"
                >
                  {w.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={w.imageUrl} alt="" className="w-10 h-10 rounded-sm object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-sm bg-bone/[0.04] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{w.title}</div>
                    {w.category && <div className="font-mono text-[10px] text-bone/30 truncate">{w.category}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
