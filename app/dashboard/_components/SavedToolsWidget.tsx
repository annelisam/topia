'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { faviconUrl } from '../../resources/tools/favicon';

interface SavedTool {
  id: string;
  name: string;
  slug: string;
  url: string | null;
  category: string | null;
}

export default function SavedToolsWidget() {
  const { authenticated, user } = usePrivy();
  const [tools, setTools] = useState<SavedTool[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated || !user?.id) { setLoading(false); return; }
    (async () => {
      try {
        // 1. Get list of saved slugs
        const savedRes = await fetch(`/api/tools/save?privyId=${encodeURIComponent(user.id)}`);
        const { savedToolSlugs } = await savedRes.json();
        if (!Array.isArray(savedToolSlugs) || savedToolSlugs.length === 0) {
          setTools([]);
          return;
        }
        // 2. Fetch the tool records (we hit the existing /api/tools list and filter)
        const toolsRes = await fetch('/api/tools');
        const { tools: allTools } = await toolsRes.json();
        const map = new Map<string, SavedTool>();
        for (const t of allTools as SavedTool[]) map.set(t.slug, t);
        const resolved = (savedToolSlugs as string[])
          .map((slug) => map.get(slug))
          .filter((x): x is SavedTool => Boolean(x));
        setTools(resolved);
      } catch (err) {
        console.error('Failed to load saved tools', err);
        setTools([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated, user?.id]);

  if (loading) {
    return (
      <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
        <p className="block font-mono text-[12px] uppercase tracking-[0.2em] mb-3 font-bold opacity-40" style={{ color: 'var(--foreground)' }}>Saved tools</p>
        <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>loading…</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] font-bold opacity-40" style={{ color: 'var(--foreground)' }}>
          ★ Saved tools {tools && tools.length > 0 && <span className="opacity-60">· {tools.length}</span>}
        </p>
        <Link
          href="/resources/tools"
          className="font-mono text-[11px] uppercase tracking-[2px] opacity-40 hover:opacity-80 transition no-underline"
          style={{ color: 'var(--foreground)' }}
        >
          browse all →
        </Link>
      </div>

      {(!tools || tools.length === 0) ? (
        <p className="font-mono text-[12px] opacity-50" style={{ color: 'var(--foreground)' }}>
          Click ☆ on any tool in <Link href="/resources/tools" className="underline">/resources/tools</Link> to save it here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tools.slice(0, 8).map((t) => {
            const favicon = faviconUrl(t.url, 32);
            return (
              <Link
                key={t.id}
                href={`/resources/tools/${t.slug}`}
                className="flex items-center gap-3 border rounded-lg px-3 py-2 hover:opacity-80 transition no-underline"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="w-7 h-7 rounded-sm border overflow-hidden flex items-center justify-center shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                  {favicon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={favicon} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>{t.name[0]?.toUpperCase()}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] uppercase font-bold truncate" style={{ color: 'var(--foreground)' }}>{t.name}</div>
                  {t.category && <div className="font-mono text-[10px] opacity-40 truncate" style={{ color: 'var(--foreground)' }}>{t.category}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
