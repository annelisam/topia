'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FollowUser {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  path: string | null;
}

interface Props {
  userId: string;
  initialTab: 'followers' | 'following';
  followerCount: number;
  followingCount: number;
  onClose: () => void;
}

const PATH_LABEL: Record<string, string> = {
  worldbuilder: 'Worldbuilder',
  catalyst: 'Catalyst',
  anchor: 'Anchor',
};

export default function FollowListModal({
  userId,
  initialTab,
  followerCount,
  followingCount,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [cache, setCache] = useState<Record<string, FollowUser[]>>({});
  const [loading, setLoading] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (cache[tab]) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/follow/list?userId=${userId}&type=${tab}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [tab]: data.users ?? [] }));
      })
      .catch(() => {
        if (!cancelled) setCache((prev) => ({ ...prev, [tab]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, userId, cache]);

  const list = cache[tab];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[70dvh] flex flex-col bg-[var(--page-bg)] border border-ink/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex shrink-0 border-b border-ink/10">
          {(['followers', 'following'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 font-mono text-[11px] uppercase tracking-[2px] transition-colors ${
                tab === t ? 'text-ink border-b-2 border-[var(--accent)]' : 'text-ink/40 hover:text-ink/60'
              }`}
            >
              {t === 'followers' ? followerCount : followingCount} {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {loading && !list ? (
            <div className="py-10 text-center font-mono text-[11px] uppercase tracking-[2px] text-ink/30">
              Loading…
            </div>
          ) : list && list.length > 0 ? (
            <ul className="divide-y divide-ink/[0.06]">
              {list.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/profile/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03] transition-colors no-underline"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-ink/10 shrink-0 flex items-center justify-center">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-mono text-[14px] text-ink/40 uppercase">
                          {(u.name || u.username || '?').charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-basement font-bold text-[14px] text-ink truncate leading-tight">
                        {u.name || u.username}
                      </div>
                      <div className="font-mono text-[11px] text-ink/40 truncate">@{u.username}</div>
                    </div>
                    {u.path && PATH_LABEL[u.path] && (
                      <span className="font-mono text-[9px] uppercase tracking-[1px] text-ink/30 shrink-0">
                        {PATH_LABEL[u.path]}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center font-mono text-[11px] uppercase tracking-[2px] text-ink/30">
              {tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
