'use client';

import { useEffect, useState } from 'react';

interface Guest {
  username: string;
  avatarUrl: string;
  roleTags: string[];
}

// "Who's Going" — a Luma-style avatar stack that opens a guest list. Only shows
// guests who claimed a handle; the list reveals photo + handle + tags (no
// names), and each row opens that profile in a new tab.
export default function WhosGoing({ eventId, goingCount }: { eventId: string; goingCount: number }) {
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

  return (
    <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <p className="font-mono text-[10px] uppercase tracking-[2px] opacity-40 mb-3" style={{ color: 'var(--foreground)' }}>
        {goingCount} Going
      </p>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center bg-transparent border-none cursor-pointer p-0 hover:opacity-90 transition"
        aria-label="See who's going"
      >
        {preview.map((g, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={g.username}
            src={g.avatarUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
            style={{ border: '2px solid var(--background)', marginLeft: i === 0 ? 0 : -10, zIndex: preview.length - i }}
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
      </button>

      {open && <GuestsModal guests={shown} count={goingCount} onClose={() => setOpen(false)} />}
    </div>
  );
}

function GuestsModal({ guests, count, onClose }: { guests: Guest[]; count: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border max-h-[80vh] flex flex-col"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-3">
          <div className="flex items-start justify-between">
            <h3 className="font-mono text-[16px] font-bold uppercase tracking-tight" style={{ color: 'var(--foreground)' }}>{count} Guests</h3>
            <button onClick={onClose} className="font-mono text-[18px] opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer" style={{ color: 'var(--foreground)' }} aria-label="Close">×</button>
          </div>
          <p className="font-mono text-[11px] opacity-50 mt-1.5 leading-snug" style={{ color: 'var(--foreground)' }}>
            Guests who haven&rsquo;t claimed a TOPIA handle aren&rsquo;t shown.
          </p>
        </div>
        <div className="overflow-y-auto px-4 pb-4 space-y-1">
          {guests.map((g) => (
            <a
              key={g.username}
              href={`/profile/${g.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2 rounded-xl no-underline transition hover:bg-[var(--surface-hover)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[13px] font-bold truncate" style={{ color: 'var(--foreground)' }}>@{g.username}</div>
                {g.roleTags.length > 0 && (
                  <div className="font-mono text-[10px] uppercase tracking-wider opacity-50 truncate" style={{ color: 'var(--foreground)' }}>
                    {g.roleTags.slice(0, 3).map((t) => t.replace(/-/g, ' ')).join(' · ')}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
