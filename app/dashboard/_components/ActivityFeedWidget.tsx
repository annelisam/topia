'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface Notif {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatar: string | null;
  metadata: Record<string, unknown> | null;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

function describe(n: Notif): { verb: string; objectLabel: string | null; objectHref: string | null } {
  const meta = (n.metadata ?? {}) as Record<string, string | undefined>;
  switch (n.type) {
    case 'follow':
      return { verb: 'followed you', objectLabel: null, objectHref: null };
    case 'world_member_added':
      return {
        verb: 'added you to',
        objectLabel: meta.worldTitle ?? 'a world',
        objectHref: meta.worldSlug ? `/worlds/${meta.worldSlug}` : null,
      };
    case 'event_rsvp':
      return {
        verb: 'RSVPd to',
        objectLabel: meta.eventName ?? 'your event',
        objectHref: meta.eventSlug ? `/events/${meta.eventSlug}` : null,
      };
    case 'tool_save':
      return {
        verb: 'saved',
        objectLabel: meta.toolName ?? 'a tool',
        objectHref: meta.toolSlug ? `/resources/tools/${meta.toolSlug}` : null,
      };
    default:
      return { verb: n.type.replace(/_/g, ' '), objectLabel: null, objectHref: null };
  }
}

export default function ActivityFeedWidget() {
  const { authenticated, user } = usePrivy();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authenticated || !user?.id) { setLoaded(true); return; }
    fetch(`/api/notifications?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((json) => setNotifs((json.notifications as Notif[]) ?? []))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [authenticated, user?.id]);

  if (!loaded) return null;
  if (notifs.length === 0) return null;

  // Trim to last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = notifs.filter((n) => new Date(n.createdAt).getTime() >= cutoff).slice(0, 8);
  if (recent.length === 0) return null;
  const unread = recent.filter((n) => !n.read).length;

  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden mb-6 bg-obsidian">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 flex items-center gap-2">
          Activity · last 7d
          {unread > 0 && <span className="bg-lime text-obsidian font-bold px-1.5 py-0.5 rounded-sm text-[10px]">{unread} new</span>}
        </span>
      </div>
      <div className="divide-y divide-bone/[0.04]">
        {recent.map((n) => {
          const d = describe(n);
          const actorHref = n.actorUsername ? `/profile/${n.actorUsername}` : null;
          return (
            <div key={n.id} className={`flex items-center gap-3 px-4 py-2.5 ${n.read ? '' : 'bg-bone/[0.02]'}`}>
              {/* Actor avatar */}
              {actorHref ? (
                <Link href={actorHref} className="shrink-0 no-underline">
                  {n.actorAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={n.actorAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-bone/15" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-bone/10 border border-bone/15 flex items-center justify-center">
                      <span className="font-basement text-[11px] text-bone/40">{(n.actorName || n.actorUsername || '?')[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </Link>
              ) : null}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] text-bone truncate">
                  {actorHref ? (
                    <Link href={actorHref} className="font-bold uppercase text-bone hover:text-lime no-underline">
                      {n.actorName || `@${n.actorUsername}`}
                    </Link>
                  ) : (
                    <span className="font-bold uppercase">{n.actorName || `@${n.actorUsername}` || 'Someone'}</span>
                  )}
                  <span className="text-bone/60"> {d.verb} </span>
                  {d.objectHref && d.objectLabel ? (
                    <Link href={d.objectHref} className="font-bold uppercase text-lime hover:opacity-80 no-underline">{d.objectLabel}</Link>
                  ) : d.objectLabel ? (
                    <span className="font-bold uppercase text-bone">{d.objectLabel}</span>
                  ) : null}
                </div>
              </div>

              <span className="font-mono text-[10px] text-bone/30 shrink-0">{relativeTime(n.createdAt)}</span>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
