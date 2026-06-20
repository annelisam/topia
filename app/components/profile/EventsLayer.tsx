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
          /* Gallery — rich event cards */
          <div className="flex flex-col gap-3 p-3">
            {rows.map(({ ev, role }) => {
              const chip = dayChip(ev.date);
              const hosts = ev.hosts ?? [];
              return (
                <Link key={ev.id} href={`/events/${ev.slug}`} className="group block rounded-lg overflow-hidden border border-bone/[0.08] bg-obsidian no-underline hover:border-bone/20 transition-colors">
                  <div className="relative aspect-[16/10] overflow-hidden bg-bone/[0.05]">
                    {ev.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center font-basement font-black text-[28px] uppercase text-bone/10">TOPIA</span>
                    )}
                    {/* Date chip */}
                    <div className="absolute top-3 left-3 bg-obsidian/80 backdrop-blur-sm border border-bone/20 rounded-sm px-2 py-1 text-center min-w-[40px]">
                      <div className="font-basement font-black text-[16px] leading-none text-bone">{chip.day}</div>
                      <div className="font-mono text-[8px] uppercase tracking-[2px] text-bone/60 mt-0.5">{chip.mon}</div>
                    </div>
                    <span className={`absolute top-3 right-3 ${roleBadge(role)} bg-obsidian/60 backdrop-blur-sm`}>{role}</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-basement font-black text-[clamp(16px,5vw,22px)] uppercase text-bone leading-[0.95] line-clamp-2">{ev.eventName}</h3>
                    <span className="font-mono text-[10px] text-bone/40 block mt-1.5">{[ev.startTime, ev.city].filter(Boolean).join(' · ') || fmtDate(ev.date)}</span>
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-bone/[0.06]">
                      <div className="flex items-center gap-2 min-w-0">
                        {hosts.length > 0 && (
                          <div className="flex -space-x-1.5 shrink-0">
                            {hosts.slice(0, 3).map((h) => (
                              <span key={h.userId} className="block w-5 h-5 rounded-full overflow-hidden border border-obsidian bg-bone/10" title={h.name || h.username || ''}>
                                {h.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={h.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="w-full h-full flex items-center justify-center text-[8px] text-bone/40">{(h.name || h.username || '?')[0]?.toUpperCase()}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-bone/50 truncate">{ev.rsvpCount ?? 0} going</span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[2px] border border-bone/20 px-3 py-1.5 rounded-sm text-bone/70 group-hover:border-lime group-hover:text-lime transition-colors">View</span>
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
