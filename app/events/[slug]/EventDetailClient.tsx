'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePrivy } from '@privy-io/react-auth';
import Navigation from '../../components/Navigation';
import LoadingBar from '../../components/LoadingBar';
import RsvpConfirmationModal from './RsvpConfirmationModal';

interface EventHost {
  userId: string;
  role: string;
  worldId: string | null;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  worldTitle: string | null;
  worldSlug: string | null;
  worldImageUrl: string | null;
}

interface EventDetail {
  id: string;
  eventName: string;
  slug: string;
  description: string | null;
  date: string | null;
  dateIso: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  city: string | null;
  address: string | null;
  link: string | null;
  imageUrl: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
  hosts: EventHost[];
  rsvpCount: number;
  userRsvped: boolean;
  isHost: boolean;
}

const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="font-mono text-[13px] leading-relaxed mb-3 last:mb-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</p>
  ),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="font-mono text-[18px] font-bold mb-3 mt-6 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-mono text-[16px] font-bold mb-2 mt-5 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-mono text-[14px] font-bold mb-2 mt-4 first:mt-0" style={{ color: 'var(--foreground)' }} {...props}>{children}</h3>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="font-mono text-[13px] list-disc pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="font-mono text-[13px] list-decimal pl-5 mb-3 space-y-1" style={{ color: 'var(--foreground)' }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="font-mono text-[13px] leading-relaxed" style={{ color: 'var(--foreground)' }} {...props}>{children}</li>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition" style={{ color: 'var(--foreground)' }} {...props}>{children}</a>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 pl-4 my-3 opacity-80" style={{ borderColor: 'var(--border-color)' }} {...props}>{children}</blockquote>
  ),
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="font-mono text-[12px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-hover)' }} {...props}>{children}</code>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em {...props}>{children}</em>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-6" style={{ borderColor: 'var(--border-color)' }} {...props} />
  ),
};

/* ── Timezone display helper ──────────────────────────────────── */

function formatTimezone(tz: string | null): string {
  if (!tz) return '';
  const shortNames: Record<string, string> = {
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Anchorage': 'AKT',
    'Pacific/Honolulu': 'HT',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Europe/Berlin': 'CET',
    'Asia/Tokyo': 'JST',
    'Asia/Shanghai': 'CST',
    'Australia/Sydney': 'AEST',
  };
  return shortNames[tz] || tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

/* ── Calendar helpers ──────────────────────────────────────────── */

function parseEventDate(dateStr: string | null, timeStr: string | null): Date | null {
  if (!dateStr) return null;

  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const dmy = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1]);
    const month = monthMap[dmy[2]];
    const year = parseInt(dmy[3]);
    if (month !== undefined) {
      const d = new Date(year, month, day);
      if (timeStr) applyTime(d, timeStr);
      return d;
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    if (timeStr) applyTime(d, timeStr);
    return d;
  }

  return null;
}

function applyTime(date: Date, timeStr: string) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    date.setHours(hours, minutes, 0, 0);
  }
}

function formatDateICal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function generateICalFile(event: EventDetail): string {
  const start = parseEventDate(event.date, event.startTime);
  const end = parseEventDate(event.date, event.endTime);

  const dtStart = start ? formatDateICal(start) : '';
  const dtEnd = end ? formatDateICal(end) : (start ? formatDateICal(new Date(start.getTime() + 2 * 60 * 60 * 1000)) : '');

  const location = event.address || event.city || '';
  const description = event.description?.replace(/\n/g, '\\n') || '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TOPIA//Events//EN',
    'BEGIN:VEVENT',
    dtStart ? `DTSTART:${dtStart}` : '',
    dtEnd ? `DTEND:${dtEnd}` : '',
    `SUMMARY:${event.eventName}`,
    location ? `LOCATION:${location}` : '',
    description ? `DESCRIPTION:${description}` : '',
    event.link ? `URL:${event.link}` : '',
    `UID:${event.id}@topia.events`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function getGoogleCalendarUrl(event: EventDetail): string {
  const start = parseEventDate(event.date, event.startTime);
  const end = parseEventDate(event.date, event.endTime);

  const dtStart = start ? formatDateICal(start) : '';
  const dtEnd = end ? formatDateICal(end) : (start ? formatDateICal(new Date(start.getTime() + 2 * 60 * 60 * 1000)) : '');
  const location = event.address || event.city || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.eventName,
    dates: `${dtStart}/${dtEnd}`,
    details: event.description || '',
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ── Main Client Component ────────────────────────────────────── */

export default function EventDetailClient({ slug }: { slug: string }) {
  const { user: privyUser, authenticated, login } = usePrivy();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showRsvpModal, setShowRsvpModal] = useState(false);

  useEffect(() => {
    const viewerParam = privyUser?.id ? `&viewerPrivyId=${privyUser.id}` : '';
    fetch(`/api/events?slug=${slug}${viewerParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.events?.length > 0) {
          setEvent(data.events[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, privyUser?.id]);

  const downloadICal = () => {
    if (!event) return;
    const ical = generateICalFile(event);
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.slug}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRsvp = async () => {
    if (!event || !privyUser?.id) {
      login();
      return;
    }
    setRsvpLoading(true);
    try {
      if (event.userRsvped) {
        await fetch('/api/events/rsvp', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: privyUser.id, eventId: event.id }),
        });
        setEvent({ ...event, userRsvped: false, rsvpCount: event.rsvpCount - 1 });
      } else {
        const res = await fetch('/api/events/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId: privyUser.id, eventId: event.id }),
        });
        if (res.ok) {
          setEvent({ ...event, userRsvped: true, rsvpCount: event.rsvpCount + 1 });
          setShowRsvpModal(true);
        }
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <LoadingBar />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>Event not found.</p>
        <Link href="/events" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Events</Link>
      </div>
    );
  }

  const location = event.address || event.city || '';
  const hasCalendarData = !!event.date;
  const tzLabel = formatTimezone(event.timezone);
  const isPast = event.dateIso ? event.dateIso < new Date().toISOString().slice(0, 10) : false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="events" />

      <div className="pt-20 sm:pt-24 pb-16">
        {/* Back link */}
        <div className="container mx-auto px-4 sm:px-6 mb-6">
          <Link href="/events" className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← Events
          </Link>
        </div>

        {/* Partiful-style centered card */}
        <div className="max-w-lg mx-auto px-4 sm:px-6">
          {/* 1:1 Square Image */}
          {event.imageUrl && (
            <div
              className="w-full rounded-2xl overflow-hidden mb-6 border"
              style={{ aspectRatio: '1', borderColor: 'var(--border-color)' }}
            >
              <img
                src={event.imageUrl}
                alt={event.eventName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-3" style={{ color: 'var(--foreground)' }}>
            {event.eventName}
          </h1>

          {isPast && (
            <span
              className="inline-block px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest font-bold mb-5"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)', opacity: 0.6 }}
            >
              Past Event
            </span>
          )}

          {!isPast && <div className="mb-2" />}

          {/* Hosts */}
          {event.hosts && event.hosts.length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {event.hosts.map((host) => (
                  <Link
                    key={host.userId}
                    href={host.username ? `/profile/${host.username}` : '#'}
                    className="block relative hover:z-10 transition-transform hover:scale-110"
                    title={host.name || host.username || 'Host'}
                  >
                    {host.avatarUrl ? (
                      <img
                        src={host.avatarUrl}
                        alt={host.name || host.username || 'Host'}
                        className="w-8 h-8 rounded-full border-2 object-cover"
                        style={{ borderColor: 'var(--background)' }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold"
                        style={{ borderColor: 'var(--background)', backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}
                      >
                        {(host.name || host.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <div className="font-mono text-[12px] opacity-60" style={{ color: 'var(--foreground)' }}>
                Hosted by{' '}
                {event.hosts.map((host, i) => (
                  <span key={host.userId}>
                    {i > 0 && (i === event.hosts.length - 1 ? ' & ' : ', ')}
                    <Link
                      href={host.username ? `/profile/${host.username}` : '#'}
                      className="underline hover:opacity-60 transition"
                    >
                      {host.worldTitle || host.name || host.username || 'Unknown'}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info rows — icon-style like Partiful */}
          <div className="space-y-4 mb-6">
            {/* Date & Time */}
            {(event.date || event.startTime) && (
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[14px] opacity-40 mt-0.5" style={{ color: 'var(--foreground)' }}>
                  &#x25F7;
                </span>
                <div>
                  <p className="font-mono text-[14px] font-bold" style={{ color: 'var(--foreground)' }}>
                    {event.date}
                  </p>
                  {event.startTime && (
                    <p className="font-mono text-[13px] opacity-60" style={{ color: 'var(--foreground)' }}>
                      {event.startTime}
                      {event.endTime && ` – ${event.endTime}`}
                      {tzLabel && ` ${tzLabel}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[14px] opacity-40 mt-0.5" style={{ color: 'var(--foreground)' }}>
                  &#x25C7;
                </span>
                <p className="font-mono text-[14px]" style={{ color: 'var(--foreground)' }}>
                  {location}
                </p>
              </div>
            )}

            {/* RSVP count */}
            {event.rsvpCount > 0 && (
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[14px] opacity-40 mt-0.5" style={{ color: 'var(--foreground)' }}>
                  &#x2713;
                </span>
                <p className="font-mono text-[14px] opacity-60" style={{ color: 'var(--foreground)' }}>
                  {event.rsvpCount} going
                </p>
              </div>
            )}

            {/* External link */}
            {event.link && (
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[14px] opacity-40 mt-0.5" style={{ color: 'var(--foreground)' }}>
                  &#x2197;
                </span>
                <a
                  href={event.link.startsWith('http') ? event.link : `https://${event.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[14px] underline hover:opacity-60 transition"
                  style={{ color: 'var(--foreground)' }}
                >
                  Event Link
                </a>
              </div>
            )}
          </div>

          {/* Add to Calendar buttons */}
          {hasCalendarData && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={downloadICal}
                className="flex-1 sm:flex-none px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg cursor-pointer text-center"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                + iCal / Apple
              </button>
              <a
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg text-center"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                + Google Calendar
              </a>
            </div>
          )}

          {/* RSVP button — for non-hosts on non-past events */}
          {!isPast && !event.isHost && (
            <div className="mb-8">
              <button
                onClick={handleRsvp}
                disabled={rsvpLoading}
                className="w-full px-4 py-3 font-mono text-[12px] uppercase tracking-widest transition rounded-lg cursor-pointer text-center font-bold"
                style={event.userRsvped
                  ? { backgroundColor: 'var(--foreground)', color: 'var(--background)', opacity: rsvpLoading ? 0.5 : 1 }
                  : { backgroundColor: 'var(--foreground)', color: 'var(--background)', opacity: rsvpLoading ? 0.5 : 1 }
                }
              >
                {rsvpLoading ? '...' : event.userRsvped ? 'Going \u2713' : 'RSVP'}
              </button>
            </div>
          )}

          {/* Edit Event button for hosts */}
          {event.isHost && (
            <div className="mb-8">
              <Link
                href={`/dashboard/edit-event/${event.slug}`}
                className="inline-block px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg text-center"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                Edit Event
              </Link>
            </div>
          )}

          {/* Divider */}
          {event.description && (
            <div className="border-t mb-8" style={{ borderColor: 'var(--border-color)' }} />
          )}

          {/* Description */}
          {event.description && (
            <section className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-3 opacity-50" style={{ color: 'var(--foreground)' }}>
                About
              </p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {event.description}
              </ReactMarkdown>
            </section>
          )}
        </div>
      </div>

      {/* RSVP Confirmation Modal */}
      {showRsvpModal && event && (
        <RsvpConfirmationModal
          eventName={event.eventName}
          date={event.date}
          city={event.city}
          slug={event.slug}
          onClose={() => setShowRsvpModal(false)}
        />
      )}
    </div>
  );
}
