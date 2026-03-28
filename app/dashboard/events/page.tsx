'use client';

import Link from 'next/link';
import { useDashboard } from '../_components/DashboardContext';

export default function DashboardEventsPage() {
  const { hostedEvents } = useDashboard();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold uppercase" style={{ color: 'var(--foreground)' }}>Events</h1>
        <Link href="/dashboard/create-event" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--background)', backgroundColor: 'var(--foreground)' }}>
          + Create Event
        </Link>
      </div>

      {hostedEvents.length === 0 ? (
        <div className="border rounded-xl p-10 text-center" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-mono text-[13px] opacity-40 mb-4" style={{ color: 'var(--foreground)' }}>You haven&apos;t hosted any events yet</p>
          <Link href="/dashboard/create-event" className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
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
                <h3 className="font-mono text-[13px] font-bold uppercase truncate mb-1" style={{ color: 'var(--foreground)' }}>{ev.eventName}</h3>
                {(ev.date || ev.city) && (
                  <p className="font-mono text-[10px] opacity-40 mb-3" style={{ color: 'var(--foreground)' }}>
                    {[ev.date, ev.city].filter(Boolean).join(' \u00b7 ')}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Link href={`/events/${ev.slug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
                    View
                  </Link>
                  <Link href={`/dashboard/edit-event/${ev.slug}`} className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border hover:opacity-70 transition" style={{ color: 'var(--foreground)', borderColor: 'var(--foreground)' }}>
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
