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

type Mode = 'manual' | 'import';

/**
 * Quick-create event modal. Two flows:
 *   - manual: type fields directly
 *   - import: paste a URL from Partiful / Luma / Eventbrite (or any
 *     OG-tagged page), we fetch + extract title/date/cover/etc.
 * For deep editing, the modal links to /dashboard/create-event.
 */
export default function SubmitEventModal({ open, onClose, onCreated }: Props) {
  const { authenticated, user } = usePrivy();
  const [mode, setMode] = useState<Mode>('import');
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [city, setCity] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [externalSource, setExternalSource] = useState<string | null>(null);

  // Import flow state
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedSource, setImportedSource] = useState<string | null>(null);

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
    setMode('import');
    setEventName(''); setDate(''); setStartTime(''); setCity(''); setLink(''); setImageUrl(''); setDescription('');
    setExternalSource(null);
    setImportUrl(''); setImportedSource(null);
    setError(''); setSuccess(false);
  }, [open]);

  if (!open) return null;

  async function handleImport() {
    if (!importUrl.trim()) { setError('Paste an event link first'); return; }
    setImporting(true);
    setError('');
    try {
      const res = await fetch('/api/events/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Could not fetch event details');
        return;
      }
      const d = json.data;
      if (d.title)     setEventName(d.title);
      if (d.dateIso)   setDate(d.dateIso);
      if (d.startTime) {
        // d.startTime is "9:30 PM"; convert back to 24h for <input type="time">
        const m = d.startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (m) {
          let h = parseInt(m[1], 10);
          if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
          if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
          setStartTime(`${String(h).padStart(2, '0')}:${m[2]}`);
        }
      }
      if (d.city)        setCity(d.city);
      if (d.imageUrl)    setImageUrl(d.imageUrl);
      if (d.description) setDescription(d.description.slice(0, 600));
      if (d.link)        setLink(d.link);
      setExternalSource(json.source);
      setImportedSource(json.source);
      // Switch to manual mode so user can review/edit before publishing
      setMode('manual');
    } catch (err) {
      console.error('import failed', err);
      setError('Network error — try again');
    } finally {
      setImporting(false);
    }
  }

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
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          externalSource,
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
        className="relative w-full max-w-lg max-h-[90vh] bg-obsidian text-bone rounded-lg border border-bone/[0.08] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-lime px-4 py-2 flex items-center justify-between shrink-0">
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
              {importedSource && importedSource !== 'other' ? (
                <>Imported from <span className="text-bone capitalize">{importedSource}</span>. </>
              ) : null}
              Add a richer description, image, or co-hosts anytime in the full editor.
            </p>
            <Link
              href="/dashboard/events"
              className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm no-underline hover:opacity-90 transition inline-block"
            >
              manage events →
            </Link>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {/* Mode toggle */}
            <div className="flex border-b border-bone/[0.06] shrink-0">
              <button
                type="button"
                onClick={() => setMode('import')}
                className={`flex-1 font-mono text-[11px] uppercase tracking-[2px] py-3 transition cursor-pointer border-b-2 bg-transparent border-l-0 border-r-0 border-t-0 ${
                  mode === 'import' ? 'text-lime border-lime' : 'text-bone/40 border-transparent hover:text-bone'
                }`}
              >
                ⤓ Import from URL
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex-1 font-mono text-[11px] uppercase tracking-[2px] py-3 transition cursor-pointer border-b-2 bg-transparent border-l-0 border-r-0 border-t-0 ${
                  mode === 'manual' ? 'text-lime border-lime' : 'text-bone/40 border-transparent hover:text-bone'
                }`}
              >
                ✎ Create manually
              </button>
            </div>

            {mode === 'import' ? (
              <div className="p-5 md:p-6">
                <h2 className="font-basement font-black text-[clamp(20px,2vw,26px)] uppercase text-bone mb-1">Import event</h2>
                <p className="font-mono text-[11px] text-bone/40 mb-4 leading-relaxed">
                  Paste a link from <span className="text-bone">Partiful</span>, <span className="text-bone">Luma</span>, or <span className="text-bone">Eventbrite</span> — we&apos;ll auto-fill title, date, cover image, and description. Any OG-tagged page works too.
                </p>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://lu.ma/abc · https://partiful.com/e/xyz · https://eventbrite.com/e/…"
                  className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone placeholder:text-bone/25 px-3 py-2 rounded-sm outline-none transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImport(); } }}
                />

                {/* Platform hints */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { name: 'Partiful', host: 'partiful.com', accent: '#FF5BD7' },
                    { name: 'Luma',     host: 'lu.ma',        accent: '#4F46FF' },
                    { name: 'Eventbrite', host: 'eventbrite.com', accent: '#FF5C34' },
                  ].map((p) => (
                    <span
                      key={p.name}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1px] border px-2 py-0.5 rounded-sm"
                      style={{ borderColor: `${p.accent}40`, color: p.accent }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.accent }} />
                      {p.name}
                    </span>
                  ))}
                </div>

                {error && <div className="mt-3 font-mono text-[11px] uppercase tracking-[2px] text-pink/80">{error}</div>}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer"
                  >
                    or enter manually →
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || !importUrl.trim()}
                    className="font-mono text-[11px] uppercase tracking-[2px] bg-lime text-obsidian px-4 py-2 rounded-sm disabled:opacity-50 hover:opacity-90 transition cursor-pointer border-none"
                  >
                    {importing ? 'fetching…' : 'fetch details →'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 md:p-6">
                <h2 className="font-basement font-black text-[clamp(20px,2vw,26px)] uppercase text-bone mb-1">
                  {importedSource ? 'Review event' : 'Create an event'}
                </h2>
                <p className="font-mono text-[11px] text-bone/40 mb-5">
                  {importedSource && importedSource !== 'other' ? (
                    <>Imported from <span className="text-bone capitalize">{importedSource}</span>. Edit anything before publishing.</>
                  ) : (
                    'Capture the essentials. Add details later in the full editor.'
                  )}
                </p>

                {imageUrl && (
                  <div className="mb-4 relative rounded-sm overflow-hidden border border-bone/10 bg-bone/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="w-full aspect-[16/9] object-cover" />
                  </div>
                )}

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
                    <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">
                      Event link {importedSource ? <span className="text-bone/30 normal-case">— RSVP on {importedSource}</span> : null}
                    </label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://"
                      className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[13px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors"
                    />
                  </div>
                  {description && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent border border-bone/15 focus:border-bone/40 font-mono text-[12px] text-bone px-3 py-1.5 rounded-sm outline-none transition-colors resize-none"
                      />
                    </div>
                  )}
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
                      {submitting ? 'creating…' : 'publish →'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
