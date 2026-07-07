'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { StarIcon } from '../../components/ui/Icons';

interface SavedEvent {
  id: string;
  eventName: string;
  slug: string;
  dateIso: string | null;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
}

export default function SavedEventsWidget() {
  const { authenticated, user } = usePrivy();
  const [events, setEvents] = useState<SavedEvent[] | null>(null);

  useEffect(() => {
    if (!authenticated || !user?.id) return;
    (async () => {
      try {
        // Get saved slugs
        const res1 = await fetch(`/api/events/save?privyId=${encodeURIComponent(user.id)}`);
        const { savedEventSlugs } = await res1.json();
        if (!Array.isArray(savedEventSlugs) || savedEventSlugs.length === 0) {
          setEvents([]); return;
        }
        // Pull from overview endpoint (returns all events with metadata)
        const res2 = await fetch(`/api/events/overview?privyId=${encodeURIComponent(user.id)}`);
        const { events: allEvents } = await res2.json();
        const map = new Map<string, SavedEvent>();
        for (const e of allEvents as SavedEvent[]) map.set(e.slug, e);
        const resolved = (savedEventSlugs as string[])
          .map((slug) => map.get(slug))
          .filter((x): x is SavedEvent => Boolean(x));
        setEvents(resolved);
      } catch (err) {
        console.error('saved events load failed', err);
        setEvents([]);
      }
    })();
  }, [authenticated, user?.id]);

  if (!events || events.length === 0) return null;

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 flex items-center gap-2">
          <span className="text-[var(--accent-ink)]/80"><StarIcon size={11} filled /></span>
          Saved events · {events.length}
        </span>
        <Link
          href="/events"
          className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink transition no-underline"
        >
          all events →
        </Link>
      </div>
      <div className="divide-y divide-ink/[0.04]">
        {events.slice(0, 6).map((ev) => {
          const chip = formatDayChip(ev.dateIso);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink/[0.03] transition no-underline"
            >
              <div className="shrink-0 w-10 text-center border border-ink/15 rounded-sm py-1">
                <div className="font-basement text-[14px] leading-none text-ink">{chip.day}</div>
                <div className="font-mono text-[8px] uppercase tracking-[2px] text-ink/40 mt-0.5">{chip.mon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] uppercase font-bold text-ink truncate">{ev.eventName}</div>
                <div className="font-mono text-[10px] text-ink/30 truncate">{ev.city || (ev.dateIso ? '' : 'TBD')}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function formatDayChip(iso: string | null): { day: string; mon: string } {
  if (!iso) return { day: '—', mon: '' };
  try {
    const d = new Date(iso);
    return {
      day: String(d.getUTCDate()).padStart(2, '0'),
      mon: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    };
  } catch { return { day: '—', mon: '' }; }
}
