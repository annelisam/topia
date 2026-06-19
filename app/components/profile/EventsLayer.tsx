'use client';

import Link from 'next/link';
import { PathConfig } from './pathConfig';

interface EventItem {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
}

interface Props {
  config: PathConfig;
  hosted: EventItem[];
  attended: EventItem[];
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

// Profile Events tab — events the user hosts (HOST) and ones they've RSVP'd to
// (GOING), deduped, styled to match the other passport layers.
export default function EventsLayer({ config, hosted, attended }: Props) {
  const seen = new Set<string>();
  const rows: { ev: EventItem; role: 'HOST' | 'GOING' }[] = [];
  for (const ev of hosted) { if (!seen.has(ev.id)) { seen.add(ev.id); rows.push({ ev, role: 'HOST' }); } }
  for (const ev of attended) { if (!seen.has(ev.id)) { seen.add(ev.id); rows.push({ ev, role: 'GOING' }); } }

  return (
    <div className="bg-obsidian flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Events</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{rows.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No events yet</span>
          </div>
        ) : rows.map(({ ev, role }, i) => (
          <Link
            key={ev.id}
            href={`/events/${ev.slug}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-bone/[0.04] hover:bg-bone/[0.02] transition-colors no-underline"
            style={{ minHeight: '56px' }}
          >
            <div className="w-[40px] h-[40px] shrink-0 rounded-sm overflow-hidden bg-bone/[0.05] flex items-center justify-center">
              {ev.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-[9px] text-bone/20">{String(i + 1).padStart(2, '0')}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[12px] uppercase font-bold text-bone block truncate">{ev.eventName}</span>
              <span className="font-mono text-[9px] text-bone/30">{[fmtDate(ev.date), ev.city].filter(Boolean).join(' · ')}</span>
            </div>
            <span className={`font-mono text-[8px] uppercase tracking-wider rounded-sm px-2 py-0.5 shrink-0 border ${role === 'HOST' ? 'text-lime border-lime/30' : 'text-bone/40 border-bone/[0.12]'}`}>
              {role}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
