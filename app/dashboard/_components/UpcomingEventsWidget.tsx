'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface UpcomingEvent {
  id: string;
  eventName: string;
  slug: string;
  dateIso: string | null;
  date: string | null;
  startTime: string | null;
  city: string | null;
  imageUrl: string | null;
  role: 'hosting' | 'attending';
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

export default function UpcomingEventsWidget() {
  const { authenticated, user } = usePrivy();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authenticated || !user?.id) { setLoaded(true); return; }
    fetch(`/api/dashboard/upcoming?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((json) => setEvents(json.events ?? []))
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [authenticated, user?.id]);

  if (!loaded) return null;
  if (events.length === 0) return null;

  return (
    <div className="border border-bone/[0.08] rounded-lg overflow-hidden mb-6 bg-obsidian">
      <div className="bg-obsidian border-b border-bone/[0.06] px-4 py-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40">Upcoming · {events.length}</span>
        <Link href="/events" className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 hover:text-bone no-underline">
          all events →
        </Link>
      </div>
      <div className="divide-y divide-bone/[0.04]">
        {events.map((ev) => {
          const chip = formatDayChip(ev.dateIso);
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-bone/[0.03] transition no-underline"
            >
              {/* Date chip */}
              <div className="shrink-0 w-12 text-center border border-bone/15 rounded-sm py-1.5">
                <div className="font-basement text-[18px] leading-none text-bone">{chip.day}</div>
                <div className="font-mono text-[9px] uppercase tracking-[2px] text-bone/40 mt-0.5">{chip.mon}</div>
              </div>
              {/* Event */}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] uppercase font-bold text-bone truncate">{ev.eventName}</div>
                <div className="font-mono text-[10px] text-bone/40 truncate">
                  {ev.startTime ? `${ev.startTime} ` : ''}{ev.city ? `· ${ev.city}` : ''}
                </div>
              </div>
              {/* Role badge */}
              <span
                className={`font-mono text-[9px] uppercase tracking-[2px] px-2 py-0.5 border rounded-sm shrink-0 ${
                  ev.role === 'hosting' ? 'text-lime border-lime/40' : 'text-bone/40 border-bone/15'
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
