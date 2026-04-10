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

  // Fetch cities on mount
  useEffect(() => {
    fetch('/api/events?cities=true')
      .then(r => r.json())
      .then(data => setCities(data.cities || []))
      .catch(console.error);
  }, []);

  // Fetch events when city filter changes
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
  const preview = hoveredEvent || allSorted[0] || null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
      <PageShell>
        <section className="px-[var(--page-pad)] py-[clamp(24px,4vw,48px)]">
          <div className="max-w-[var(--content-max)] mx-auto">
            {/* Editorial grid */}
            <div className="grid grid-rows-[auto_auto_1fr] grid-cols-1 md:grid-cols-[1fr_1fr] gap-[3px] border border-obsidian/15 rounded-lg overflow-hidden min-h-[600px] md:h-[calc(100vh-var(--nav-height)-48px)]">

              {/* Row 1: Title bar */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-[1fr_auto]">
                <div className="p-4 md:p-5 flex items-center" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                  <h1 className="font-basement font-black text-lg md:text-xl uppercase tracking-tight leading-none">Events</h1>
                </div>
                <div className="bg-obsidian p-4 md:p-5 flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-bone/40">{allSorted.length} listed</span>
                  <Link
                    href="/dashboard/create-event"
                    className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-card no-underline transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  >
                    + Create
                  </Link>
                </div>
              </div>

              {/* Row 2: Search/filters */}
              <div className="col-span-1 md:col-span-2 bg-obsidian p-3 flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 min-w-[150px] bg-bone/[0.04] border border-bone/[0.08] rounded-lg px-3 py-2 font-mono text-[11px] text-bone placeholder:text-bone/30 outline-none"
                />
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="bg-bone/[0.04] border border-bone/[0.08] rounded-lg px-3 py-2 font-mono text-[11px] text-bone outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Locations</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Row 3 Left: Ledger index */}
              <div className="bg-obsidian overflow-y-auto relative">
                {/* Ruled lines background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #f5f0e8 39px, #f5f0e8 40px)' }}
                />

                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="font-mono text-[11px] text-bone/40 uppercase tracking-wider">Loading...</span>
                  </div>
                ) : allSorted.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="font-mono text-[11px] text-bone/40 uppercase tracking-wider">
                      {selectedCity ? `No events in ${selectedCity}` : 'No events yet'}
                    </span>
                  </div>
                ) : (
                  allSorted.map((event, i) => {
                    const isPast = event.dateIso && event.dateIso < today;
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className={`flex items-stretch no-underline transition-colors duration-150 border-b border-bone/[0.04] ${hoveredEvent?.id === event.id ? 'bg-bone/[0.04]' : 'hover:bg-bone/[0.02]'}`}
                        onMouseEnter={() => setHoveredEvent(event)}
                      >
                        {/* Line number */}
                        <div className="w-[28px] flex items-center justify-center font-mono text-[9px] text-bone/20 shrink-0 py-3">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        {/* Color strip */}
                        <div className="w-[2px] shrink-0" style={{ backgroundColor: isPast ? 'var(--orange)' : 'var(--accent)' }} />
                        {/* Content */}
                        <div className="flex-1 px-3 py-3 min-w-0">
                          <div className="font-mono text-[11px] text-bone font-bold uppercase tracking-wide truncate">
                            {event.eventName}
                          </div>
                          <div className="font-mono text-[9px] text-bone/40 mt-0.5 flex items-center gap-2">
                            {event.date && <span>{event.date}</span>}
                            {event.city && <span>· {event.city}</span>}
                            {isPast && <span className="text-orange/60">past</span>}
                          </div>
                        </div>
                        {/* RSVP count */}
                        {event.rsvpCount != null && event.rsvpCount > 0 && (
                          <div className="flex items-center pr-3">
                            <span className="font-mono text-[9px] text-bone/30">{event.rsvpCount}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Row 3 Right: Preview panel */}
              <div className="bg-obsidian hidden md:flex flex-col relative">
                {preview ? (
                  <>
                    {/* Image */}
                    <div className="flex-1 relative overflow-hidden">
                      {preview.imageUrl ? (
                        <img
                          src={preview.imageUrl}
                          alt={preview.eventName}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-mono text-[48px] text-bone/10">E</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                    </div>
                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-basement font-black text-2xl uppercase leading-none tracking-tight text-bone mb-2">
                        {preview.eventName}
                      </h3>
                      <div className="font-mono text-[10px] text-bone/50 uppercase tracking-wider space-y-1">
                        {preview.date && <p>{preview.date}{preview.startTime ? ` · ${preview.startTime}` : ''}</p>}
                        {preview.city && <p>{preview.city}</p>}
                      </div>
                      {/* Hosts */}
                      {preview.hosts && preview.hosts.length > 0 && (
                        <div className="flex -space-x-1.5 mt-3">
                          {preview.hosts.slice(0, 4).map(host => (
                            <div key={host.userId} className="w-6 h-6 rounded-full overflow-hidden border-2 border-obsidian">
                              {host.avatarUrl ? (
                                <img src={host.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-bone/20 font-mono text-[8px] text-bone">
                                  {(host.name || host.username || '?')[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Action bar */}
                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <span className="font-mono text-[9px] text-bone/30 uppercase tracking-wider self-center">
                          {preview.rsvpCount || 0} going
                        </span>
                        <Link
                          href={`/events/${preview.slug}`}
                          className="font-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-card no-underline transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                        >
                          View Event →
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="font-mono text-[11px] text-bone/20 uppercase tracking-wider">Hover to preview</span>
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
