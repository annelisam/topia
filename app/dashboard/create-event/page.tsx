'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../components/Navigation';
import { useUserProfile } from '../../hooks/useUserProfile';

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-lg';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';

/* ── Markdown preview components ──────────────────────────────── */

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

/* ── Markdown toolbar ─────────────────────────────────────────── */

function MarkdownToolbar({ onInsert }: { onInsert: (before: string, after: string, placeholder: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('**', '**', 'bold')} title="Bold"><strong>B</strong></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('*', '*', 'italic')} title="Italic"><em>I</em></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('[', '](url)', 'link text')} title="Link">Link</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('## ', '', 'Heading')} title="Heading">H2</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('- ', '', 'list item')} title="List">List</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('> ', '', 'quote')} title="Quote">Quote</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('\n---\n', '', '')} title="Divider">---</button>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function CreateEventPage() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [venue, setVenue] = useState('');
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'America/New_York';
  });
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [worldId, setWorldId] = useState('');
  const { worldMemberships } = useUserProfile();
  const myWorlds = useMemo(() =>
    worldMemberships
      .filter(wm => wm.role === 'world_builder' || wm.role === 'owner')
      .map(wm => ({ id: wm.worldId, title: wm.worldTitle, slug: wm.worldSlug })),
    [worldMemberships]
  );

  useEffect(() => {
    fetch('/api/events?cities=true')
      .then(r => r.json())
      .then(data => setCities(data.cities || []))
      .catch(console.error);
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        // For 1:1 crop — take the center square
        const size = Math.min(w, h);
        const sx = (w - size) / 2;
        const sy = (h - size) / 2;
        const outSize = Math.min(size, maxWidth);
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, sx, sy, size, size, 0, 0, outSize, outSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageUrl(compressed);
  };

  const insertMarkdown = (before: string, after: string, placeholder: string) => {
    const textarea = document.getElementById('description-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = description.substring(start, end);
    const text = selected || placeholder;
    const newText = description.substring(0, start) + before + text + after + description.substring(end);
    setDescription(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + text.length + after.length;
      textarea.setSelectionRange(
        selected ? newCursorPos : start + before.length,
        selected ? newCursorPos : start + before.length + text.length
      );
    }, 0);
  };

  // Format date for storage: convert "2025-07-18" to "18-Jul-2025"
  const formatDateForStorage = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  // Format time for storage: convert "21:00" to "9:00 PM"
  const formatTimeForStorage = (time24: string): string => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const handleSubmit = async () => {
    if (!user || !eventName.trim()) {
      setError('Event name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          eventName: eventName.trim(),
          slug: generateSlug(eventName),
          description: description || null,
          date: date ? formatDateForStorage(date) : null,
          dateIso: date || null,
          startTime: startTime ? formatTimeForStorage(startTime) : null,
          endTime: endTime ? formatTimeForStorage(endTime) : null,
          timezone: timezone || null,
          city: (showCustomCity ? customCity.trim() : city) || null,
          address: venue || null,
          link: link || null,
          imageUrl: imageUrl || null,
          worldId: worldId || null,
        }),
      });

      if (!res.ok) {
        let msg = 'Failed to create event';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {
          if (res.status === 413) msg = 'Image is too large. Try using a smaller file.';
        }
        setError(msg);
        return;
      }

      const data = await res.json();
      router.push(`/events/${data.event.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>Please log in to create an event.</p>
        <Link href="/events" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Events</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="events" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/events" className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← Events
          </Link>
        </div>

        <div className="max-w-2xl">
          <h1 className="font-mono text-[20px] font-bold uppercase mb-8" style={{ color: 'var(--foreground)' }}>
            Create Event
          </h1>

          {/* Event Image (1:1) */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Image</label>
            <p className="font-mono text-[10px] opacity-30 mb-2" style={{ color: 'var(--foreground)' }}>Square 1:1 ratio. Will be cropped to square if needed.</p>
            {imageUrl && (
              <div className="mb-3 relative inline-block">
                <img src={imageUrl} alt="preview" className="w-32 h-32 rounded-lg object-cover border" style={{ borderColor: 'var(--border-color)' }} />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full font-mono text-[10px] transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <label
                className="inline-block px-4 py-2 border font-mono text-[12px] uppercase tracking-widest cursor-pointer transition-all rounded-lg theme-hover-invert"
                style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                {imageUrl ? 'Change Image' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Event Name */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Name *</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="What's the event called?"
              className={inputCls}
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputCls}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputCls}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>


          {/* Timezone */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputCls + ' appearance-none cursor-pointer'}
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              <option value="Europe/London">Greenwich Mean Time (GMT)</option>
              <option value="Europe/Paris">Central European Time (CET)</option>
              <option value="Europe/Berlin">Central European Time (CET)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
              <option value="Asia/Shanghai">China Standard Time (CST)</option>
              <option value="Australia/Sydney">Australian Eastern Time (AEST)</option>
            </select>
          </div>

          {/* City */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>City *</label>
            {!showCustomCity ? (
              <select
                value={city}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowCustomCity(true);
                    setCity('');
                  } else {
                    setCity(e.target.value);
                  }
                }}
                className={inputCls + ' appearance-none cursor-pointer'}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                <option value="">Select a city...</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new__">+ Add new city</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="e.g. Los Angeles"
                  className={inputCls}
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setShowCustomCity(false); setCustomCity(''); }}
                  className="px-3 py-2 font-mono text-[11px] border rounded-lg hover:opacity-70 transition shrink-0"
                  style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Venue / Address */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Venue / Address</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. The Fonda Theatre, 6126 Hollywood Blvd"
              className={inputCls}
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* Event Link */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Link</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className={inputCls}
              style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* Host as World */}
          {myWorlds.length > 0 && (
            <div className="mb-6">
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Host as World</label>
              <p className="font-mono text-[10px] opacity-30 mb-2" style={{ color: 'var(--foreground)' }}>Optionally host this event as one of your worlds</p>
              <select
                value={worldId}
                onChange={(e) => setWorldId(e.target.value)}
                className={inputCls + ' appearance-none cursor-pointer'}
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
              >
                <option value="">Just me (personal)</option>
                {myWorlds.map(w => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description with markdown editor */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>Description</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDescriptionPreview(false)}
                  className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-lg transition-all"
                  style={!descriptionPreview
                    ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                    : { color: 'var(--foreground)', opacity: 0.4 }
                  }
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescriptionPreview(true)}
                  className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-lg transition-all"
                  style={descriptionPreview
                    ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' }
                    : { color: 'var(--foreground)', opacity: 0.4 }
                  }
                >
                  Preview
                </button>
              </div>
            </div>

            {!descriptionPreview ? (
              <>
                <MarkdownToolbar onInsert={insertMarkdown} />
                <textarea
                  id="description-editor"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder="Describe the event... Supports **bold**, *italic*, [links](url), ## headings, - lists, > quotes"
                  className={inputCls}
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '150px' }}
                />
                <p className="font-mono text-[10px] mt-1 opacity-30" style={{ color: 'var(--foreground)' }}>
                  Supports Markdown formatting
                </p>
              </>
            ) : (
              <div
                className="border px-4 py-3 rounded-lg min-h-[150px]"
                style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}
              >
                {description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {description}
                  </ReactMarkdown>
                ) : (
                  <p className="font-mono text-[13px] opacity-30" style={{ color: 'var(--foreground)' }}>Nothing to preview</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-10 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleSubmit}
              disabled={saving || !eventName.trim()}
              className="px-6 py-2 font-mono text-[12px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-lg"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {saving ? 'Creating...' : 'Create Event'}
            </button>
            <Link
              href="/events"
              className="px-6 py-2 font-mono text-[12px] uppercase tracking-widest border hover:opacity-70 transition rounded-lg"
              style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
            >
              Cancel
            </Link>
            {error && <span className="font-mono text-[12px]" style={{ color: '#FF5C34' }}>{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
