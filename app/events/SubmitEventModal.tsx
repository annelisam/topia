'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function formatDateForStorage(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function formatTimeForStorage(time24: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Quick-create event modal — captures the essentials. For richer editing
 * (markdown description, image upload, world association, co-host invites)
 * the modal links to /dashboard/create-event.
 */
export default function SubmitEventModal({ open, onClose, onCreated }: Props) {
  const { authenticated, user } = usePrivy();
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setEventName(''); setDate(''); setStartTime(''); setCity(''); setLink('');
    setError(''); setSuccess(false);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !eventName.trim()) { setError('Event name required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          eventName: eventName.trim(),
          slug: generateSlug(eventName),
          date: date ? formatDateForStorage(date) : null,
          dateIso: date || null,
          startTime: startTime ? formatTimeForStorage(startTime) : null,
          city: city.trim() || null,
          link: link.trim() || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create event');
        return;
      }
      setSuccess(true);
      onCreated?.();
    } catch { setError('Failed to create event'); }
    finally { setSubmitting(false); }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-3 sm:px-6 py-6 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-obsidian text-bone rounded-lg border border-bone/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-lime px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-obsidian/60">topia://create-event</span>
          <button onClick={onClose} className="font-mono text-[14px] text-obsidian/70 hover:text-obsidian transition bg-transparent border-none cursor-pointer w-5 h-5 leading-none flex items-center justify-center" aria-label="Close">×</button>
        </div>

        {!authenticated ? (
          <div className="p-6 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[2px] text-bone/60">Log in to create an event</p>
          </div>
        ) : success ? (
          <div className="p-6 text-center">
            <h2 className="font-basement font-black text-[24px] uppercase text-lime mb-2">Event created ✓</h2>
            <p className="font-mono text-[12px] text-bone/60 leading-relaxed mb-4">
              You can now add a description, image, co-hosts, and more in the full editor.
            </p>
            <Link
              href="/dashboard/events"
              className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm no-underline hover:opacity-90 transition inline-block"
            >
              manage events →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 md:p-6">
            <h2 className="font-basement font-black text-[clamp(20px,2vw,28px)] uppercase text-bone mb-1">Create an event</h2>
            <p className="font-mono text-[11px] text-bone/40 mb-5">Capture the essentials. Add details later in the full editor.</p>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Name *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[12px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Start time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[12px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Los Angeles · Online · …"
                  className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Event link</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://"
                  className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                />
              </div>
            </div>

            {error && <div className="mt-3 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>}

            <div className="mt-5 flex items-center justify-between gap-3">
              <Link
                href="/dashboard/create-event"
                className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone no-underline"
              >
                use full editor →
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
                >
                  {submitting ? 'creating…' : 'create →'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
