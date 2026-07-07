'use client';

import Link from 'next/link';
import { useOverview } from './DashboardOverviewContext';

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

export default function UpcomingEventsWidget() {
  const { data, loading } = useOverview();

  // Skeleton while batched fetch is in flight
  if (loading || !data) return <UpcomingSkeleton />;

  const events = data.upcoming;
  if (events.length === 0) return null;

  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40">Upcoming · {events.length}</span>
        <Link href="/events" className="font-mono text-[10px] uppercase tracking-[2px] text-ink/30 hover:text-ink no-underline">
          all events →
        </Link>
      </div>
      <div className="divide-y divide-ink/[0.04]">
        {events.map((ev) => {
          const chip = formatDayChip(ev.dateIso);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03] transition no-underline"
            >
              <div className="shrink-0 w-12 text-center border border-ink/15 rounded-sm py-1.5">
                <div className="font-basement text-[18px] leading-none text-ink">{chip.day}</div>
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-ink/40 mt-0.5">{chip.mon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] uppercase font-bold text-ink truncate">{ev.eventName}</div>
                <div className="font-mono text-[10px] text-ink/40 truncate">
                  {ev.startTime ? `${ev.startTime} ` : ''}{ev.city ? `· ${ev.city}` : ''}
                </div>
              </div>
              <span
                className={`font-mono text-[9px] uppercase tracking-[2px] px-2 py-0.5 border rounded-sm shrink-0 ${
                  ev.role === 'hosting' ? 'text-[var(--accent-ink)] border-[var(--accent-ink)]/40' : 'text-ink/40 border-ink/15'
                }`}
              >
                {ev.role}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingSkeleton() {
  return (
    <div className="border border-ink/[0.08] rounded-lg overflow-hidden bg-[var(--page-bg)]">
      <div className="bg-[var(--page-bg)] border-b border-ink/[0.06] px-4 py-2">
        <div className="h-3 w-24 bg-ink/[0.06] rounded animate-pulse" />
      </div>
      <div className="divide-y divide-ink/[0.04]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-12 h-11 rounded-sm bg-ink/[0.04] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 bg-ink/[0.06] rounded animate-pulse" />
              <div className="h-2.5 w-24 bg-ink/[0.04] rounded animate-pulse" />
            </div>
            <div className="h-5 w-14 bg-ink/[0.04] rounded-sm animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
