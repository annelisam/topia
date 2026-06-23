'use client';

import Link from 'next/link';
import { WorldConfig } from './worldConfig';

export interface WorldEvent {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
}

export default function EventsLayer({ config, events }: { config: WorldConfig; events: WorldEvent[] }) {
  return (
    <div className="bg-[var(--page-bg)] flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Events</span>
        <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-40`}>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No events yet</span>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.slug}`}
              className="group flex flex-col rounded-lg overflow-hidden border border-ink/[0.08] bg-[var(--page-bg)] hover:border-ink/25 transition-colors no-underline"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-ink/[0.04]">
                {ev.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <span className="font-basement font-black text-[clamp(18px,4vw,28px)] uppercase text-ink/10 text-center leading-none">{ev.eventName}</span>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 55%)' }} />
                {ev.city && <span className="absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[2px] text-bone/70">{ev.city}</span>}
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] text-ink font-bold uppercase truncate">{ev.eventName}</span>
                {ev.date && <span className="font-mono text-[11px] text-ink/40 shrink-0">{ev.date}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
