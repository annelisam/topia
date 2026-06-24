'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Guest {
  username: string;
  avatarUrl: string;
  roleTags: string[];
}

// "Who's Going" — a Luma-style avatar stack that opens a guest list. The list
// reveals photo + handle + tags (no names), each row opening that profile in a
// new tab. Only viewers who RSVP'd (or the host) can see it; everyone else gets
// a blurred teaser nudging them to RSVP.
export default function WhosGoing({ eventId, goingCount, canView }: { eventId: string; goingCount: number; canView: boolean }) {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/events/guests?eventId=${eventId}`)
      .then((r) => r.json())
      .then((d) => setGuests(d.guests ?? []))
      .catch(() => setGuests([]));
  }, [eventId]);

  // Lock background scroll while the guest list is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Nothing claimed yet, or no one going — hide entirely.
  if (goingCount <= 0 || (guests !== null && guests.length === 0)) return null;

  const shown = guests ?? [];
  const preview = shown.slice(0, 6);
  const extra = Math.max(0, goingCount - preview.length);

  const stack = (
    <div className="flex items-center" style={canView ? undefined : { filter: 'blur(5px)' }} aria-hidden={!canView}>
      {preview.map((g, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={g.username}
          src={g.avatarUrl}
          alt=""
          className="w-9 h-9 rounded-full object-cover"
          style={{ border: '2px solid var(--background)', marginLeft: i === 0 ? 0 : -10 }}
        />
      ))}
      {extra > 0 && (
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0"
          style={{ border: '2px solid var(--background)', backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)', marginLeft: -10 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );

  return (
    <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <p className="font-mono text-[10px] uppercase tracking-[2px] opacity-40 mb-3" style={{ color: 'var(--foreground)' }}>
        {goingCount} Going
      </p>

      {canView ? (
        <button
          onClick={() => setOpen(true)}
          className="bg-transparent border-none cursor-pointer p-0 hover:opacity-90 transition"
          aria-label="See who's going"
        >
          {stack}
        </button>
      ) : (
        <div>
          {stack}
          <p className="mt-3 font-mono text-[11px] opacity-50" style={{ color: 'var(--foreground)' }}>
            RSVP to see who&rsquo;s going.
          </p>
        </div>
      )}

      {open && canView && createPortal(
        <GuestsModal guests={shown} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </div>
  );
}

function GuestsModal({ guests, onClose }: { guests: Guest[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border max-h-[82vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)', boxShadow: '0 24px 70px -16px rgba(0,0,0,0.75)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-start justify-between">
            <h3 className="font-mono text-[15px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>Who&rsquo;s going</h3>
            <button onClick={onClose} className="font-mono text-[18px] leading-none opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>
          </div>
          <p className="font-mono text-[11px] opacity-45 mt-1.5 leading-snug" style={{ color: 'var(--foreground)' }}>
            Only guests who claimed a TOPIA handle are shown.
          </p>
        </div>
        <div className="overflow-y-auto p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {guests.map((g) => (
              <a
                key={g.username}
                href={`/profile/${g.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-3 rounded-xl border no-underline transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface-hover)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[13px] font-bold truncate" style={{ color: 'var(--foreground)' }}>@{g.username}</div>
                  {/* tags ↔ "View profile" swap on hover (no layout shift) */}
                  <div className="relative h-3.5 mt-0.5">
                    <div className="absolute inset-0 font-mono text-[10px] uppercase tracking-wider opacity-45 truncate transition-opacity group-hover:opacity-0" style={{ color: 'var(--foreground)' }}>
                      {g.roleTags.length > 0 ? g.roleTags.slice(0, 3).map((t) => t.replace(/-/g, ' ')).join(' · ') : 'On the list'}
                    </div>
                    <div className="absolute inset-0 font-mono text-[10px] uppercase tracking-wider truncate opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--accent-ink)' }}>
                      View profile ↗
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
