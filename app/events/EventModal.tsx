'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { CheckIcon, StarIcon } from '../components/ui/Icons';
import EventSourceBadge from './EventSourceBadge';

interface EventHost {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
}

interface EventDetail {
  id: string;
  eventName: string;
  slug: string;
  date: string | null;
  dateIso: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  city: string | null;
  address: string | null;
  link: string | null;
  imageUrl: string | null;
  description: string | null;
  hosts: EventHost[];
  rsvpCount: number;
  isGoing: boolean;
  isHosting: boolean;
  isSaved: boolean;
  externalSource?: string | null;
  sharerName?: string | null;
  sharerUsername?: string | null;
  sharerAvatarUrl?: string | null;
}

interface Props {
  event: EventDetail | null;
  onClose: () => void;
  onToggleRsvp: (eventId: string, going: boolean) => Promise<void>;
  onToggleSave: (slug: string, saved: boolean) => Promise<void>;
}

export default function EventModal({ event, onClose, onToggleRsvp, onToggleSave }: Props) {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [rsvpPending, setRsvpPending] = useState(false);
  const [savePending, setSavePending] = useState(false);

  // ESC + scroll lock
  useEffect(() => {
    if (!event) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [event, onClose]);

  if (!event) return null;

  const today = new Date().toISOString().slice(0, 10);
  const isPast = !!(event.dateIso && event.dateIso < today);
  const accent = event.isHosting ? '#e4fe52' : isPast ? '#FF5C34' : '#e4fe52';

  async function handleRsvp() {
    if (!event || rsvpPending) return;
    setRsvpPending(true);
    try { await onToggleRsvp(event.id, !event.isGoing); }
    finally { setRsvpPending(false); }
  }

  async function handleSave() {
    if (!event || savePending) return;
    setSavePending(true);
    try { await onToggleSave(event.slug, !event.isSaved); }
    finally { setSavePending(false); }
  }

  async function handleShare() {
    if (!event) return;
    const url = `${window.location.origin}/events/${event.slug}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: event.eventName,
          url,
        });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied');
    } catch { /* clipboard not available */ }
  }

  return (
    <div
      className="fixed inset-0 z-[100] backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.65)' }}
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-full sm:max-w-md md:max-w-lg bg-obsidian text-bone border-l border-bone/[0.08] overflow-hidden flex flex-col shadow-2xl"
        style={{ animation: 'slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0.6; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>
        {/* Accent strip */}
        <div className="px-4 py-2 flex items-center justify-between shrink-0" style={{ backgroundColor: accent }}>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">topia://events</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/events/${event.slug}`)}
              className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/70 hover:text-obsidian transition bg-transparent border-none cursor-pointer"
            >
              ⛶ expand
            </button>
            <button
              onClick={onClose}
              className="font-mono text-[14px] text-obsidian/70 hover:text-obsidian transition bg-transparent border-none cursor-pointer w-5 h-5 leading-none flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Image */}
          {event.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={event.imageUrl} alt={event.eventName} className="w-full aspect-[2/1] object-cover" />
          ) : (
            <div className="w-full aspect-[2/1] bg-bone/[0.03] flex items-center justify-center">
              <span className="font-basement font-black text-[clamp(60px,10vw,160px)] leading-none text-bone/10 uppercase">
                {event.eventName[0]?.toUpperCase()}
              </span>
            </div>
          )}

          <div className="p-5 md:p-6 space-y-5">
            {/* Title + meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {event.isHosting && (
                  <span className="font-mono text-[9px] uppercase tracking-[2px] bg-lime text-obsidian px-1.5 py-0.5 rounded-sm font-bold">Hosting</span>
                )}
                {event.isGoing && !event.isHosting && (
                  <span className="font-mono text-[9px] uppercase tracking-[2px] bg-green/20 text-green border border-green/40 px-1.5 py-0.5 rounded-sm">✓ Going</span>
                )}
                {isPast && (
                  <span className="font-mono text-[9px] uppercase tracking-[2px] bg-orange/20 text-orange border border-orange/40 px-1.5 py-0.5 rounded-sm">Past</span>
                )}
                <EventSourceBadge source={event.externalSource} size="sm" />
              </div>
              <h1 className="font-basement font-black text-[clamp(22px,3vw,32px)] uppercase leading-[0.95] text-bone">{event.eventName}</h1>
              <div className="font-mono text-[12px] text-bone/50 mt-2">
                {event.date && <span>{event.date}</span>}
                {event.startTime && <span> · {event.startTime}{event.endTime ? `–${event.endTime}` : ''}</span>}
                {event.timezone && <span className="text-bone/30"> {event.timezone}</span>}
                {event.city && <span> · {event.city}</span>}
              </div>
              {event.address && (
                <div className="font-mono text-[11px] text-bone/40 mt-1">{event.address}</div>
              )}
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2">
              {!isPast && event.externalSource && event.link ? (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[2px] px-4 py-2 rounded-sm border bg-lime text-obsidian border-lime hover:opacity-90 transition no-underline"
                >
                  {event.externalSource === 'partiful'   ? 'RSVP on Partiful →'
                  : event.externalSource === 'luma'      ? 'RSVP on Luma →'
                  : event.externalSource === 'eventbrite' ? 'Tickets on Eventbrite →'
                  : 'Open event →'}
                </a>
              ) : authenticated && !isPast && (
                <button
                  onClick={handleRsvp}
                  disabled={rsvpPending}
                  className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[2px] px-4 py-2 rounded-sm border transition cursor-pointer disabled:opacity-50 ${
                    event.isGoing
                      ? 'bg-green text-obsidian border-green'
                      : 'bg-lime text-obsidian border-lime hover:opacity-90'
                  }`}
                >
                  {rsvpPending ? '…' : event.isGoing ? (<><CheckIcon size={10} /> Going</>) : 'RSVP'}
                </button>
              )}
              {authenticated && (
                <button
                  onClick={handleSave}
                  disabled={savePending}
                  className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[2px] px-3 py-2 rounded-sm border transition cursor-pointer disabled:opacity-50 ${
                    event.isSaved
                      ? 'bg-bone text-obsidian border-bone'
                      : 'bg-transparent text-bone/70 border-bone/20 hover:border-bone/60 hover:text-bone'
                  }`}
                >
                  <StarIcon size={10} filled={event.isSaved} /> {event.isSaved ? 'Saved' : 'Save'}
                </button>
              )}
              {event.link && !event.externalSource && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] uppercase tracking-[2px] text-bone/70 border border-bone/20 hover:border-bone/60 hover:text-bone px-3 py-2 rounded-sm transition no-underline"
                >
                  Event link →
                </a>
              )}
              <button
                onClick={handleShare}
                className="font-mono text-[11px] uppercase tracking-[2px] text-bone/60 border border-bone/20 hover:border-bone/60 hover:text-bone px-3 py-2 rounded-sm transition bg-transparent cursor-pointer"
              >
                Share
              </button>
            </div>

            {/* Shared by (external events only — no real host on TOPIA) */}
            {event.externalSource && event.sharerUsername && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">Shared by</span>
                <Link
                  href={`/profile/${event.sharerUsername}`}
                  className="inline-flex items-center gap-2 border border-bone/10 hover:border-bone/40 px-2.5 py-1.5 rounded-sm transition no-underline"
                >
                  {event.sharerAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={event.sharerAvatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-bone/10 flex items-center justify-center">
                      <span className="font-basement text-[10px] text-bone/40">{(event.sharerName || event.sharerUsername)[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="font-mono text-[11px] text-bone">@{event.sharerUsername}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/30">· submitter</span>
                </Link>
                <p className="font-mono text-[10px] text-bone/30 mt-2 leading-snug">
                  This event is hosted on {event.externalSource}. TOPIA tracks it but RSVPs and details live on the source.
                </p>
              </div>
            )}

            {/* Hosts */}
            {!event.externalSource && event.hosts.length > 0 && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">Hosted by</span>
                <div className="flex flex-wrap gap-2">
                  {event.hosts.map((h) => (
                    h.username ? (
                      <Link
                        key={h.userId}
                        href={`/profile/${h.username}`}
                        className="inline-flex items-center gap-2 border border-bone/10 hover:border-bone/40 px-2.5 py-1.5 rounded-sm transition no-underline"
                      >
                        {h.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={h.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-bone/10 flex items-center justify-center">
                            <span className="font-basement text-[10px] text-bone/40">{(h.name || h.username)[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <span className="font-mono text-[11px] text-bone">@{h.username}</span>
                      </Link>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {/* RSVP count */}
            <div className="border-t border-bone/[0.06] pt-4 flex items-center justify-between">
              <span className="font-mono text-[11px] text-bone/40">
                {event.rsvpCount} {event.rsvpCount === 1 ? 'person' : 'people'} going
              </span>
            </div>

            {/* Description preview */}
            {event.description && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/30 block mb-2">About</span>
                <p className="font-zirkon text-[13px] text-bone/70 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {event.description}
                </p>
                <Link
                  href={`/events/${event.slug}`}
                  className="inline-block mt-2 font-mono text-[11px] uppercase tracking-[2px] text-lime hover:opacity-80 no-underline"
                >
                  read more →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
