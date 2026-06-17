'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useDashboard } from '../_components/DashboardContext';

export default function DashboardEventsPage() {
  const { hostedEvents, refreshEvents } = useDashboard();
  const { user } = usePrivy();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Soft remove / restore — flips events.published. Recoverable.
  const setPublished = async (eventId: string, published: boolean) => {
    if (!user?.id) return;
    setBusyId(eventId);
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, eventId, published }),
      });
      if (res.ok) refreshEvents();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Events</h1>
        <Link href="/events/create" className="font-mono text-[13px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)' }}>
          + Create Event
        </Link>
      </div>

      {hostedEvents.length === 0 ? (
        <div className="border rounded-xl p-10 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[13px] opacity-40 mb-4" style={{ color: 'var(--foreground)' }}>You haven&apos;t hosted any events yet</p>
          <Link href="/events/create" className="font-mono text-[13px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
            Create an Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostedEvents.map(ev => (
            <div
              key={ev.id}
              className="border rounded-xl overflow-hidden group"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
            >
              {/* Image */}
              {ev.imageUrl ? (
                <div className="aspect-video overflow-hidden">
                  <img src={ev.imageUrl} alt={ev.eventName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video" style={{ backgroundColor: 'var(--foreground)', opacity: 0.05 }} />
              )}

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-mono text-[13px] font-bold uppercase truncate" style={{ color: 'var(--foreground)' }}>{ev.eventName}</h3>
                  {!ev.published && (
                    <span className="font-mono text-[12px] uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: '#FF5C34', color: '#0a0a0a' }}>
                      Draft
                    </span>
                  )}
                </div>
                {(ev.date || ev.city) && (
                  <p className="font-mono text-[13px] opacity-40 mb-3" style={{ color: 'var(--foreground)' }}>
                    {[ev.date, ev.city].filter(Boolean).join(' \u00b7 ')}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/events/${ev.slug}`} className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    View
                  </Link>
                  <Link href={`/events/${ev.slug}/edit`} className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                    Edit
                  </Link>
                  {ev.published ? (
                    <button
                      onClick={() => setPublished(ev.id, false)}
                      disabled={busyId === ev.id}
                      className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition disabled:opacity-40 cursor-pointer bg-transparent"
                      style={{ color: '#FF5C34', borderColor: 'var(--border-color)' }}
                      title="Unpublish \u2014 move back to draft (hidden from the public site)"
                    >
                      {busyId === ev.id ? '\u2026' : 'Unpublish'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setPublished(ev.id, true)}
                      disabled={busyId === ev.id}
                      className="font-mono text-[13px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition disabled:opacity-40 cursor-pointer font-bold"
                      style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }}
                      title="Publish \u2014 make it live on the public site"
                    >
                      {busyId === ev.id ? '\u2026' : 'Publish'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
