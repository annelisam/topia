'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import LoadingBar from '../components/LoadingBar';

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
  const upcoming = events.filter(e => !e.dateIso || e.dateIso >= today);
  const past = events.filter(e => e.dateIso && e.dateIso < today);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <LoadingBar />
      </div>
    );
  }

  const renderCard = (event: EventCard, isPast: boolean) => (
    <Link
      key={event.id}
      href={`/events/${event.slug}`}
      className="group block rounded-2xl overflow-hidden border transition-colors duration-200"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
    >
      {/* 1:1 image */}
      <div className="w-full overflow-hidden relative" style={{ aspectRatio: '1', backgroundColor: 'var(--surface-hover)' }}>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.eventName}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            style={isPast ? { filter: 'grayscale(40%) opacity(0.7)' } : undefined}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[32px] opacity-10" style={{ color: 'var(--foreground)' }}>E</span>
          </div>
        )}
        {isPast && (
          <span
            className="absolute top-3 right-3 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-widest font-bold"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', opacity: 0.7 }}
          >
            Past
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-mono text-[14px] font-bold uppercase leading-tight mb-2" style={{ color: 'var(--foreground)' }}>
          {event.eventName}
        </h3>

        {/* Date & Time */}
        {(event.date || event.startTime) && (
          <p className="font-mono text-[11px] opacity-60 mb-1" style={{ color: 'var(--foreground)' }}>
            {event.date}{event.startTime ? ` · ${event.startTime}` : ''}
          </p>
        )}

        {/* Location */}
        {(event.city || event.address) && (
          <p className="font-mono text-[11px] opacity-40 mb-2" style={{ color: 'var(--foreground)' }}>
            {event.city || event.address}
          </p>
        )}

        {/* Host avatars + RSVP count */}
        {((event.hosts && event.hosts.length > 0) || (event.rsvpCount != null && event.rsvpCount > 0)) && (
          <div className="flex items-center justify-between mt-auto pt-1">
            {event.hosts && event.hosts.length > 0 && (
              <div className="flex -space-x-1.5">
                {event.hosts.slice(0, 4).map((host) => (
                  <div
                    key={host.userId}
                    className="w-5 h-5 rounded-full overflow-hidden border"
                    style={{ borderColor: 'var(--background)' }}
                    title={host.name || host.username || undefined}
                  >
                    {host.avatarUrl ? (
                      <img src={host.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-[8px]" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>
                        {(host.name || host.username || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {event.rsvpCount != null && event.rsvpCount > 0 && (
              <span className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>
                {event.rsvpCount} going
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="events" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="font-mono text-[20px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>
            Events
          </h1>

          <div className="flex items-center gap-3">
            {/* City filter dropdown */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="border px-3 py-2 font-mono text-[12px] outline-none rounded-lg w-48 appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              <option value="">All Locations</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Create event link */}
            <Link
              href="/dashboard/create-event"
              className="px-4 py-2 font-mono text-[12px] uppercase tracking-widest hover:opacity-80 transition rounded-lg"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              + Create Event
            </Link>
          </div>
        </div>

        {/* No events */}
        {events.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-[13px] opacity-50" style={{ color: 'var(--foreground)' }}>
              {selectedCity ? `No events in ${selectedCity}.` : 'No events yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Upcoming events */}
            {upcoming.length > 0 && (
              <div className="mb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcoming.map(event => renderCard(event, false))}
                </div>
              </div>
            )}

            {/* Past events */}
            {past.length > 0 && (
              <div>
                <h2 className="font-mono text-[12px] uppercase tracking-[0.15em] font-bold opacity-40 mb-5" style={{ color: 'var(--foreground)' }}>
                  Past Events
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {past.map(event => renderCard(event, true))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
