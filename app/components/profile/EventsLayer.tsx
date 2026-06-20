'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PathConfig } from './pathConfig';

interface EventHost {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface EventItem {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  city: string | null;
  imageUrl: string | null;
  startTime?: string | null;
  rsvpCount?: number;
  hosts?: EventHost[];
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

function dayChip(d: string | null): { day: string; mon: string } {
  if (!d) return { day: '—', mon: '' };
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { day: '—', mon: '' };
  return { day: String(dt.getDate()), mon: dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() };
}

// Profile Events tab — events the user hosts (HOST) and ones they've RSVP'd to
// (GOING), deduped. Gallery view is primary; list view is the secondary toggle.
export default function EventsLayer({ config, hosted, attended }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const seen = new Set<string>();
  const rows: { ev: EventItem; role: 'HOST' | 'GOING' }[] = [];
  for (const ev of hosted) { if (!seen.has(ev.id)) { seen.add(ev.id); rows.push({ ev, role: 'HOST' }); } }
  for (const ev of attended) { if (!seen.has(ev.id)) { seen.add(ev.id); rows.push({ ev, role: 'GOING' }); } }

  const roleBadge = (role: 'HOST' | 'GOING') =>
    `font-mono text-[8px] uppercase tracking-wider rounded-sm px-1.5 py-0.5 shrink-0 border ${role === 'HOST' ? 'text-lime border-lime/30' : 'text-bone/40 border-bone/[0.12]'}`;

  return (
    <div className="bg-obsidian flex flex-col h-full">
      <div className={`${config.bg} px-4 py-2.5 flex items-center justify-between`}>
        <span className={`font-mono text-[11px] uppercase tracking-wider font-bold ${config.textOn}`}>Events</span>
        <div className="flex items-center gap-2.5">
          <span className={`font-mono text-[9px] uppercase tracking-[2px] ${config.textOn} opacity-30`}>{rows.length} events</span>
          {/* Gallery / list toggle — gallery first */}
          <div className={`flex items-center border ${config.textOn === 'text-obsidian' ? 'border-obsidian/20' : 'border-bone/20'} rounded-sm overflow-hidden`}>
            <button
              onClick={() => setView('grid')}
              className={`p-1 transition cursor-pointer ${view === 'grid' ? config.textOn === 'text-obsidian' ? 'bg-obsidian text-bone' : 'bg-bone text-obsidian' : `${config.textOn} opacity-50 hover:opacity-100`}`}
              title="Gallery view" aria-label="Gallery view"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="1" width="5" height="5" rx="0.5" /><rect x="8" y="1" width="5" height="5" rx="0.5" /><rect x="1" y="8" width="5" height="5" rx="0.5" /><rect x="8" y="8" width="5" height="5" rx="0.5" /></svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1 transition cursor-pointer border-l ${config.textOn === 'text-obsidian' ? 'border-obsidian/20' : 'border-bone/20'} ${view === 'list' ? config.textOn === 'text-obsidian' ? 'bg-obsidian text-bone' : 'bg-bone text-obsidian' : `${config.textOn} opacity-50 hover:opacity-100`}`}
              title="List view" aria-label="List view"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="3.5" x2="12" y2="3.5" /><line x1="2" y1="7" x2="12" y2="7" /><line x1="2" y1="10.5" x2="12" y2="10.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">No events yet</span>
          </div>
        ) : view === 'grid' ? (
          /* Gallery — compact cards that scroll sideways (carousel), not down */
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden p-2.5" style={{ scrollbarWidth: 'thin' }}>
            {rows.map(({ ev, role }) => {
              const chip = dayChip(ev.date);
              return (
                <Link key={ev.id} href={`/events/${ev.slug}`} className="group block w-[140px] shrink-0 rounded-md overflow-hidden border border-bone/[0.08] bg-obsidian no-underline hover:border-bone/20 transition-colors">
                  <div className="relative aspect-[4/3] overflow-hidden bg-bone/[0.05]">
                    {ev.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-basement font-black text-[14px] uppercase text-bone/10">TOPIA</span>
                    )}
                    <div className="absolute top-1.5 left-1.5 bg-obsidian/80 backdrop-blur-sm border border-bone/20 rounded-sm px-1 py-0.5 text-center min-w-[24px]">
                      <div className="font-basement font-black text-[10px] leading-none text-bone">{chip.day}</div>
                      <div className="font-mono text-[5px] uppercase tracking-[1px] text-bone/60">{chip.mon}</div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <h3 className="font-mono text-[9px] font-bold uppercase text-bone leading-tight line-clamp-2">{ev.eventName}</h3>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="font-mono text-[7px] text-bone/40 truncate">{ev.city || fmtDate(ev.date)}</span>
                      <span className={`${roleBadge(role)} shrink-0`}>{role}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* List */
          rows.map(({ ev, role }, i) => (
            <Link key={ev.id} href={`/events/${ev.slug}`} className="flex items-center gap-3 px-4 py-3 border-b border-bone/[0.04] hover:bg-bone/[0.02] transition-colors no-underline" style={{ minHeight: '56px' }}>
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
              <span className={roleBadge(role)}>{role}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
