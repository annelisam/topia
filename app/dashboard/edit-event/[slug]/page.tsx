'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../../components/Navigation';
import LoadingBar from '../../../components/LoadingBar';

const inputCls = 'w-full border px-3 py-2 font-mono text-[13px] outline-none transition-colors rounded-lg';
const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold opacity-60';

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
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition" style={{ color: 'var(--foreground)' }} {...props}>{children}</a>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-bold" {...props}>{children}</strong>
  ),
};

function MarkdownToolbar({ onInsert }: { onInsert: (before: string, after: string, placeholder: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('**', '**', 'bold')} title="Bold"><strong>B</strong></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('*', '*', 'italic')} title="Italic"><em>I</em></button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('[', '](url)', 'link text')} title="Link">Link</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('## ', '', 'Heading')} title="Heading">H2</button>
      <button type="button" className="px-2 py-1 font-mono text-[11px] border transition-all rounded-lg cursor-pointer theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }} onClick={() => onInsert('- ', '', 'list item')} title="List">List</button>
    </div>
  );
}

interface EventHost {
  userId: string;
  role: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  worldTitle: string | null;
}

interface RsvpUser {
  userId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface SearchUser {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export default function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [link, setLink] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Hosts
  const [hosts, setHosts] = useState<EventHost[]>([]);
  const [hostSearch, setHostSearch] = useState('');
  const [hostSearchResults, setHostSearchResults] = useState<SearchUser[]>([]);
  const [inviting, setInviting] = useState(false);

  // RSVPs
  const [rsvps, setRsvps] = useState<RsvpUser[]>([]);
  const [rsvpCount, setRsvpCount] = useState(0);

  // Load event data
  useEffect(() => {
    if (!user) return;
    fetch(`/api/events?slug=${slug}&viewerPrivyId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        const ev = data.events?.[0];
        if (!ev) return;
        setEventId(ev.id);
        setEventName(ev.eventName);
        setDate(ev.dateIso || '');
        setTimezone(ev.timezone || 'America/New_York');
        setCity(ev.city || '');
        setVenue(ev.address || '');
        setLink(ev.link || '');
        setDescription(ev.description || '');
        setImageUrl(ev.imageUrl || '');
        setHosts(ev.hosts || []);
        setRsvpCount(ev.rsvpCount || 0);

        // Parse startTime/endTime back to 24h for input
        if (ev.startTime) setStartTime(parseTo24h(ev.startTime));
        if (ev.endTime) setEndTime(parseTo24h(ev.endTime));

        // Check authorization
        if (!ev.isHost) {
          router.push(`/events/${slug}`);
          return;
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, user, router]);

  // Load RSVPs
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/rsvps?eventId=${eventId}`)
      .then(r => r.json())
      .then(data => {
        setRsvps(data.rsvps || []);
        setRsvpCount(data.rsvpCount || 0);
      })
      .catch(console.error);
  }, [eventId]);

  // Host search
  useEffect(() => {
    if (hostSearch.length < 2) { setHostSearchResults([]); return; }
    const timeout = setTimeout(() => {
      fetch(`/api/events/hosts?search=${encodeURIComponent(hostSearch)}`)
        .then(r => r.json())
        .then(data => {
          // Filter out existing hosts
          const hostIds = new Set(hosts.map(h => h.userId));
          setHostSearchResults((data.users || []).filter((u: SearchUser) => !hostIds.has(u.id)));
        })
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timeout);
  }, [hostSearch, hosts]);

  function parseTo24h(timeStr: string): string {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return '';
    let h = parseInt(match[1]);
    const m = match[2];
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }

  const formatDateForStorage = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
  };

  const formatTimeForStorage = (time24: string): string => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
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
  };

  const handleSave = async () => {
    if (!user || !eventName.trim()) { setError('Event name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId: user.id,
          eventId,
          eventName: eventName.trim(),
          slug,
          description: description || null,
          date: date ? formatDateForStorage(date) : null,
          dateIso: date || null,
          startTime: startTime ? formatTimeForStorage(startTime) : null,
          endTime: endTime ? formatTimeForStorage(endTime) : null,
          timezone: timezone || null,
          city: city || null,
          address: venue || null,
          link: link || null,
          imageUrl: imageUrl || null,
        }),
      });
      if (!res.ok) {
        let msg = 'Failed to update event';
        try { const data = await res.json(); msg = data.error || msg; } catch {}
        setError(msg);
        return;
      }
      router.push(`/events/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const inviteCoHost = async (targetUserId: string) => {
    if (!user) return;
    setInviting(true);
    try {
      const res = await fetch('/api/events/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyId: user.id, eventId, targetUserId }),
      });
      if (res.ok) {
        setHostSearch('');
        setHostSearchResults([]);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to invite');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  if (!ready) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <LoadingBar />
      </div>
    );
  }
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation currentPage="events" />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>Please log in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Navigation currentPage="events" />

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12">
        <div className="flex items-center justify-between mb-8">
          <Link href={`/events/${slug}`} className="font-mono text-[12px] uppercase tracking-widest hover:opacity-60 transition" style={{ color: 'var(--foreground)' }}>
            ← Back to Event
          </Link>
        </div>

        <div className="max-w-2xl">
          <h1 className="font-mono text-[20px] font-bold uppercase mb-8" style={{ color: 'var(--foreground)' }}>
            Edit Event
          </h1>

          {/* Event Image */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Image</label>
            {imageUrl && (
              <div className="mb-3 relative inline-block">
                <img src={imageUrl} alt="preview" className="w-32 h-32 rounded-lg object-cover border" style={{ borderColor: 'var(--border-color)' }} />
                <button onClick={() => setImageUrl('')} className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full font-mono text-[10px] transition hover:opacity-80" style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}>×</button>
              </div>
            )}
            <label className="inline-block px-4 py-2 border font-mono text-[12px] uppercase tracking-widest cursor-pointer transition-all rounded-lg theme-hover-invert" style={{ color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
              {imageUrl ? 'Change Image' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {/* Event Name */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Name *</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--foreground)' }}>End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
            </div>
          </div>

          {/* Timezone */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls + ' appearance-none cursor-pointer'} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
              <option value="Europe/London">Greenwich Mean Time (GMT)</option>
              <option value="Europe/Paris">Central European Time (CET)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
              <option value="Australia/Sydney">Australian Eastern Time (AEST)</option>
            </select>
          </div>

          {/* City */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>

          {/* Venue */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Venue / Address</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>

          {/* Link */}
          <div className="mb-6">
            <label className={labelCls} style={{ color: 'var(--foreground)' }}>Event Link</label>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }} />
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold opacity-60" style={{ color: 'var(--foreground)' }}>Description</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setDescriptionPreview(false)} className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-lg transition-all" style={!descriptionPreview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.4 }}>Write</button>
                <button type="button" onClick={() => setDescriptionPreview(true)} className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-lg transition-all" style={descriptionPreview ? { backgroundColor: 'var(--foreground)', color: 'var(--background)' } : { color: 'var(--foreground)', opacity: 0.4 }}>Preview</button>
              </div>
            </div>
            {!descriptionPreview ? (
              <>
                <MarkdownToolbar onInsert={insertMarkdown} />
                <textarea id="description-editor" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className={inputCls} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)', resize: 'vertical', minHeight: '150px' }} />
              </>
            ) : (
              <div className="border px-4 py-3 rounded-lg min-h-[150px]" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                {description ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{description}</ReactMarkdown> : <p className="font-mono text-[13px] opacity-30" style={{ color: 'var(--foreground)' }}>Nothing to preview</p>}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t my-8" style={{ borderColor: 'var(--border-color)' }} />

          {/* Co-Hosts Section */}
          <div className="mb-8">
            <h2 className="font-mono text-[14px] font-bold uppercase mb-4" style={{ color: 'var(--foreground)' }}>
              Co-Hosts
            </h2>

            {/* Current hosts */}
            <div className="space-y-2 mb-4">
              {hosts.map(host => (
                <div key={host.userId} className="flex items-center gap-3 px-3 py-2 border rounded-lg" style={{ borderColor: 'var(--border-color)' }}>
                  {host.avatarUrl ? (
                    <img src={host.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>
                      {(host.name || host.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
                      {host.name || host.username || 'Unknown'}
                      {host.worldTitle && <span className="font-normal opacity-50"> · {host.worldTitle}</span>}
                    </p>
                    <p className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>
                      {host.role === 'creator' ? 'Creator' : 'Co-host'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite co-host search */}
            {hosts.length < 6 && (
              <div className="relative">
                <input
                  type="text"
                  value={hostSearch}
                  onChange={(e) => setHostSearch(e.target.value)}
                  placeholder="Search by name or username to invite..."
                  className={inputCls}
                  style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--border-color)' }}
                />
                {hostSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border-color)' }}>
                    {hostSearchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => inviteCoHost(u.id)}
                        disabled={inviting}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:opacity-70 transition border-b last:border-b-0 text-left disabled:opacity-40"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px]" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>
                            {(u.name || u.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>{u.name || u.username}</p>
                          {u.username && <p className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>@{u.username}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {hosts.length >= 6 && (
              <p className="font-mono text-[11px] opacity-40" style={{ color: 'var(--foreground)' }}>Maximum co-hosts reached (5)</p>
            )}
          </div>

          {/* RSVPs Section */}
          <div className="mb-8">
            <h2 className="font-mono text-[14px] font-bold uppercase mb-4" style={{ color: 'var(--foreground)' }}>
              RSVPs ({rsvpCount})
            </h2>
            {rsvps.length === 0 ? (
              <p className="font-mono text-[12px] opacity-40" style={{ color: 'var(--foreground)' }}>No RSVPs yet</p>
            ) : (
              <div className="space-y-2">
                {rsvps.map(r => (
                  <div key={r.userId} className="flex items-center gap-3 px-3 py-2 border rounded-lg" style={{ borderColor: 'var(--border-color)' }}>
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-bold" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--foreground)' }}>
                        {(r.name || r.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-mono text-[12px]" style={{ color: 'var(--foreground)' }}>
                        {r.name || r.username || 'Unknown'}
                      </p>
                      {r.username && (
                        <p className="font-mono text-[10px] opacity-40" style={{ color: 'var(--foreground)' }}>@{r.username}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-10 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleSave}
              disabled={saving || !eventName.trim()}
              className="px-6 py-2 font-mono text-[12px] uppercase tracking-widest hover:opacity-80 transition disabled:opacity-40 rounded-lg"
              style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/events/${slug}`}
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
