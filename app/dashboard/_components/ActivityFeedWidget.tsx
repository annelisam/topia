'use client';

import Link from 'next/link';
import { useOverview, NotifItem } from './DashboardOverviewContext';

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

function describe(n: NotifItem): { verb: string; objectLabel: string | null; objectHref: string | null } {
  const meta = (n.metadata ?? {}) as Record<string, string | undefined>;
  switch (n.type) {
    case 'follow':
      return { verb: 'connected with you', objectLabel: null, objectHref: null };
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
  const { data, loading } = useOverview();

  if (loading || !data) return <ActivitySkeleton />;

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = data.notifications.filter((n) => new Date(n.createdAt).getTime() >= cutoff).slice(0, 8);
  if (recent.length === 0) return null;
  const unread = recent.filter((n) => !n.read).length;

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 flex items-center gap-2">
          Activity · last 7d
          {unread > 0 && <span className="bg-lime text-obsidian font-bold px-1.5 py-0.5 rounded-sm text-[10px]">{unread} new</span>}
        </span>
      </div>
      <div className="divide-y divide-ink/[0.04]">
        {recent.map((n) => {
          const d = describe(n);
          const actorHref = n.actorUsername ? `/profile/${n.actorUsername}` : null;
          return (
            <div key={n.id} className={`flex items-center gap-3 px-4 py-2.5 ${n.read ? '' : 'bg-ink/[0.02]'}`}>
              {actorHref ? (
                <Link href={actorHref} className="shrink-0 no-underline">
                  {n.actorAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={n.actorAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-ink/15" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-ink/10 border border-ink/15 flex items-center justify-center">
                      <span className="font-basement text-[11px] text-ink/40">{(n.actorName || n.actorUsername || '?')[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </Link>
              ) : null}

              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] text-ink truncate">
                  {actorHref ? (
                    <Link href={actorHref} className="font-bold uppercase text-ink hover:text-lime no-underline">
                      {n.actorName || `@${n.actorUsername}`}
                    </Link>
                  ) : (
                    <span className="font-bold uppercase">{n.actorName || `@${n.actorUsername}` || 'Someone'}</span>
                  )}
                  <span className="text-ink/60"> {d.verb} </span>
                  {d.objectHref && d.objectLabel ? (
                    <Link href={d.objectHref} className="font-bold uppercase text-lime hover:opacity-80 no-underline">{d.objectLabel}</Link>
                  ) : d.objectLabel ? (
                    <span className="font-bold uppercase text-ink">{d.objectLabel}</span>
                  ) : null}
                </div>
              </div>

              <span className="font-mono text-[10px] text-ink/30 shrink-0">{relativeTime(n.createdAt)}</span>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2">
        <div className="h-3 w-32 bg-ink/[0.06] rounded animate-pulse" />
      </div>
      <div className="divide-y divide-ink/[0.04]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-7 h-7 rounded-full bg-ink/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 h-3 bg-ink/[0.04] rounded animate-pulse" />
            <div className="h-2.5 w-6 bg-ink/[0.04] rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
