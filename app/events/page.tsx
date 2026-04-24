'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageShell from '../components/PageShell';

interface EventHost {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
}

interface EventCard {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  startTime: string | null;
  city: string | null;
  imageUrl: string | null;
  address: string | null;
  hosts?: EventHost[];
  rsvpCount?: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoveredEvent, setHoveredEvent] = useState<EventCard | null>(null);

  useEffect(() => {
    fetch('/api/events?cities=true')
      .then(r => r.json())
      .then(data => setCities(data.cities || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedCity
      ? `/api/events?city=${encodeURIComponent(selectedCity)}`
      : '/api/events';

    fetch(url)
      .then(r => r.json())
      .then(data => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCity]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = events.filter(e =>
    !search || e.eventName.toLowerCase().includes(search.toLowerCase()) ||
    (e.city && e.city.toLowerCase().includes(search.toLowerCase()))
  );
  const upcoming = filtered.filter(e => !e.dateIso || e.dateIso >= today);
  const past = filtered.filter(e => e.dateIso && e.dateIso < today);
  const allSorted = [...upcoming, ...past];
  const preview = hoveredEvent;
  const previewIsPast = !!(preview?.dateIso && preview.dateIso < today);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: 'var(--page-bg)' }}>
      <PageShell>
        <section className="min-h-screen px-4 md:px-6 py-4 md:py-6" style={{ backgroundColor: 'var(--page-bg)' }}>
          <div className="max-w-[var(--content-max)] mx-auto min-h-[600px] md:h-[calc(100vh-var(--nav-height,80px)-48px)]">
            <div className="h-full grid grid-rows-[auto_auto_1fr] grid-cols-1 md:grid-cols-[1fr_1fr] gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden">

              {/* ROW 1 — Title bar */}
              <div
                className="p-5 md:p-6 flex flex-col justify-between transition-colors duration-300"
                style={{ backgroundColor: 'var(--accent, #e4fe52)' }}
              >
                <span
                  className="font-mono text-[7px] uppercase tracking-[2px]"
                  style={{ color: 'var(--accent-text, #1a1a1a)', opacity: 0.5 }}
                >
                  events // gatherings
                </span>
                <h1
                  className="font-basement font-black text-[clamp(32px,5vw,64px)] leading-[0.85] uppercase mt-2"
                  style={{ color: 'var(--accent-text, #1a1a1a)' }}
                >
                  EVENTS
                </h1>
              </div>
              <div className="bg-obsidian p-4 flex items-center justify-between border-l border-bone/[0.04]">
                <div>
                  <span className="font-mono text-[8px] text-bone block">every event tells a story.</span>
                  <span className="font-mono text-[8px] text-bone block">gatherings, launches, sessions, rituals.</span>
                </div>
                <Link
                  href="/dashboard/create-event"
                  className="font-mono text-[9px] uppercase tracking-[2px] px-3 py-1.5 rounded no-underline transition-opacity hover:opacity-80 shrink-0 ml-3"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                >
                  + create
                </Link>
              </div>

              {/* ROW 2 — Navigation bar */}
              <div className="md:col-span-2 bg-obsidian border-t border-b border-bone/[0.04] px-4 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="search..."
                    className="font-mono text-[9px] bg-transparent border border-bone/[0.06] focus:border-bone/20 text-bone/60 placeholder:text-bone/15 px-2.5 py-1 rounded outline-none w-32 focus:w-48 transition-all"
                  />
                  <span className="font-mono text-[9px] text-bone/30">←</span>
                  <span className="font-mono text-[10px] text-bone/50 tracking-wider truncate">
                    {preview ? (
                      <>
                        <span className="text-bone/25">event:</span>{' '}
                        <span className={`font-bold ${previewIsPast ? 'text-orange' : 'text-bone'}`}>
                          {preview.eventName}
                        </span>
                      </>
                    ) : (
                      <span className="text-bone/25">hover an event to preview</span>
                    )}
                  </span>
                  <span className="font-mono text-[9px] text-bone/30">→</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[8px] text-bone/30 uppercase tracking-[2px] hidden sm:inline">
                    <span className="text-bone/50">{upcoming.length}</span> upcoming
                    <span className="text-bone/15"> / </span>
                    <span className="text-bone/50">{past.length}</span> past
                  </span>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="font-mono text-[9px] bg-transparent border border-bone/[0.06] focus:border-bone/20 text-bone/60 px-2.5 py-1 rounded outline-none cursor-pointer transition-colors"
                  >
                    <option value="" className="bg-obsidian">all locations</option>
                    {cities.map(c => (
                      <option key={c} value={c} className="bg-obsidian">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 3 LEFT — Ledger Index */}
              <div
                className="relative bg-obsidian overflow-y-auto"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,240,232,0.1) transparent' }}
              >
                {/* Crosshatch texture */}
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px), repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,240,232,1) 4px, rgba(245,240,232,1) 5px)',
                  }}
                />
                {/* Ruled lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(245,240,232,1) 39px, rgba(245,240,232,1) 40px)',
                  }}
                />
                <div className="absolute top-0 bottom-0 left-[28px] w-[1px] bg-bone/[0.06] pointer-events-none z-[1]" />

                <div className="relative z-10">
                  {loading ? (
                    <div className="flex items-center justify-center min-h-[240px]">
                      <span className="font-mono text-[10px] text-bone/30 uppercase tracking-[2px]">
                        Loading events...
                      </span>
                    </div>
                  ) : allSorted.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[240px]">
                      <span className="font-mono text-[10px] text-bone/30 uppercase tracking-[2px]">
                        {selectedCity ? `no events in ${selectedCity}` : 'no events yet'}
                      </span>
                    </div>
                  ) : (
                    allSorted.map((event, i) => {
                      const isPast = !!(event.dateIso && event.dateIso < today);
                      const isActive = hoveredEvent?.id === event.id;
                      return (
                        <Link
                          key={event.id}
                          href={`/events/${event.slug}`}
                          className={`flex items-center no-underline cursor-pointer transition-all duration-150 border-b border-bone/[0.04] ${
                            isActive ? 'bg-bone/[0.04]' : 'hover:bg-bone/[0.02]'
                          }`}
                          style={{ minHeight: '40px' }}
                          onMouseEnter={() => setHoveredEvent(event)}
                          onMouseLeave={() => setHoveredEvent(null)}
                        >
                          <div className="w-[28px] shrink-0 flex items-center justify-center">
                            <span className="font-mono text-[7px] text-bone/15">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div
                            className="w-[2px] shrink-0 self-stretch"
                            style={{ backgroundColor: isPast ? 'var(--orange)' : 'var(--accent)' }}
                          />
                          <div className="flex-1 px-3 py-2 min-w-0">
                            <span
                              className={`font-mono text-[10px] uppercase font-bold transition-colors truncate block ${
                                isActive ? (isPast ? 'text-orange' : 'text-bone') : 'text-bone/50'
                              }`}
                            >
                              {event.eventName}
                            </span>
                            <span className="font-mono text-[7px] text-bone/25 uppercase tracking-[1.5px] block mt-0.5 truncate">
                              {event.date || 'tbd'}
                              {event.city ? ` · ${event.city}` : ''}
                              {isPast ? ' · past' : ''}
                            </span>
                          </div>
                          {event.rsvpCount != null && event.rsvpCount > 0 && (
                            <span className="font-mono text-[7px] text-bone/25 pr-3 shrink-0 uppercase tracking-[1.5px]">
                              {event.rsvpCount} going
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ROW 3 RIGHT — Preview panel */}
              <div className="border-l border-bone/[0.04] overflow-hidden hidden md:block">
                {preview ? (
                  <div className="h-full grid grid-rows-[1fr_auto]">
                    {/* Image area */}
                    <div className="relative overflow-hidden">
                      {preview.imageUrl ? (
                        <img
                          src={preview.imageUrl}
                          alt={preview.eventName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full relative bg-obsidian">
                          <div
                            className="absolute inset-0 opacity-[0.04]"
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(245,240,232,1) 6px, rgba(245,240,232,1) 7px)',
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-basement font-black text-[clamp(120px,18vw,220px)] leading-none text-bone/10 uppercase">
                              E
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: previewIsPast ? 'var(--orange)' : 'var(--accent)' }}
                          />
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/50">
                            {preview.date || 'date tbd'}
                            {preview.startTime ? ` · ${preview.startTime}` : ''}
                          </span>
                          {previewIsPast && (
                            <span className="font-mono text-[7px] uppercase tracking-[2px] text-orange/70">
                              past
                            </span>
                          )}
                        </div>
                        <h2 className="font-basement font-black text-[clamp(24px,3vw,36px)] uppercase text-bone leading-[0.9]">
                          {preview.eventName}
                        </h2>
                        {preview.city && (
                          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/40 block mt-2">
                            {preview.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom detail bar */}
                    <div className="grid grid-cols-[1fr_auto] border-t border-bone/[0.04]">
                      <div className="p-4">
                        {preview.hosts && preview.hosts.length > 0 ? (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex -space-x-1.5">
                              {preview.hosts.slice(0, 4).map(host => (
                                <div
                                  key={host.userId}
                                  className="w-6 h-6 rounded-full overflow-hidden border-2 border-obsidian"
                                >
                                  {host.avatarUrl ? (
                                    <img src={host.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-bone/15 font-mono text-[8px] text-bone/70">
                                      {(host.name || host.username || '?')[0]?.toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/40 truncate">
                              hosted by {preview.hosts[0].name || preview.hosts[0].username}
                              {preview.hosts.length > 1 ? ` +${preview.hosts.length - 1}` : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="font-mono text-[10px] text-bone/40 leading-relaxed mb-3">
                            An event in the TOPIA constellation.
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/30 border border-bone/[0.08] px-2 py-0.5 rounded">
                            {preview.rsvpCount || 0} going
                          </span>
                          {preview.city && (
                            <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/30 border border-bone/[0.08] px-2 py-0.5 rounded">
                              {preview.city}
                            </span>
                          )}
                          {previewIsPast ? (
                            <span className="font-mono text-[7px] uppercase tracking-[2px] text-orange/70 border border-orange/30 px-2 py-0.5 rounded">
                              past
                            </span>
                          ) : (
                            <span className="font-mono text-[7px] uppercase tracking-[2px] text-bone/30 border border-bone/[0.08] px-2 py-0.5 rounded">
                              upcoming
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/events/${preview.slug}`}
                        className="flex items-center justify-center px-6 no-underline transition-opacity hover:opacity-80"
                        style={{ backgroundColor: previewIsPast ? 'var(--orange)' : 'var(--accent)' }}
                      >
                        <span
                          className="font-mono text-[9px] uppercase tracking-wider font-bold"
                          style={{ color: previewIsPast ? '#f5f0e8' : 'var(--accent-text)' }}
                        >
                          enter →
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="h-full relative overflow-hidden">
                    <video
                      src="/brand/vhs-loop.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0 pointer-events-none z-[2] opacity-[0.05]"
                      style={{
                        background:
                          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,240,232,0.3) 2px, rgba(245,240,232,0.3) 4px)',
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none z-[3]"
                      style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 z-[4] bg-gradient-to-t from-obsidian/90 via-obsidian/40 to-transparent p-5">
                      <span className="font-mono text-[8px] uppercase tracking-[2px] text-bone/30 block mb-2">
                        upcoming
                      </span>
                      <span className="font-basement font-black text-[clamp(24px,2.5vw,28px)] uppercase text-bone/80 block">
                        DISCOVER GATHERINGS
                      </span>
                      <span className="font-mono text-[9px] text-bone/25 block mt-2">
                        hover an event to preview
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      </PageShell>
    </div>
  );
}
