'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '../../components/Navigation';
import { useUserProfile } from '../../hooks/useUserProfile';

/* ════════════════════════════════════════════════════════════════════
 * EventComposer — the single create/edit surface. /events/create renders
 * it empty (POST); /events/[slug]/edit renders it pre-filled (PUT). Same
 * polished UI for both so the experience is identical. Save as draft keeps
 * the event unpublished (published=false); Publish makes it live.
 * ════════════════════════════════════════════════════════════════════ */

export interface EventComposerInitial {
  eventId?: string;     // edit only
  slug?: string;        // edit only — preserved so links don't break
  eventName: string;
  dateIso: string;      // 'YYYY-MM-DD'
  startTime: string;    // 'HH:MM' (24h)
  endTime: string;
  timezone: string;
  city: string;
  venue: string;
  link: string;
  description: string;
  imageUrl: string;
  worldId: string;
  published: boolean;
}

const ACCENTS = [
  { name: 'lime',   hex: '#e4fe52', on: '#0a0a0a' },
  { name: 'pink',   hex: '#FF5BD7', on: '#0a0a0a' },
  { name: 'blue',   hex: '#4F46FF', on: '#f5f0e8' },
  { name: 'orange', hex: '#FF5C34', on: '#0a0a0a' },
  { name: 'green',  hex: '#00FF88', on: '#0a0a0a' },
] as const;

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const COVER_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

const markdownComponents = {
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (<p className="font-mono text-[13px] leading-relaxed mb-3 last:mb-0 text-bone" {...props}>{children}</p>),
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (<h1 className="font-mono text-[18px] font-bold mb-3 mt-6 first:mt-0 text-bone" {...props}>{children}</h1>),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (<h2 className="font-mono text-[16px] font-bold mb-2 mt-5 first:mt-0 text-bone" {...props}>{children}</h2>),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (<ul className="font-mono text-[13px] list-disc pl-5 mb-3 space-y-1 text-bone" {...props}>{children}</ul>),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (<ol className="font-mono text-[13px] list-decimal pl-5 mb-3 space-y-1 text-bone" {...props}>{children}</ol>),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (<li className="font-mono text-[13px] leading-relaxed text-bone" {...props}>{children}</li>),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (<a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-60 transition text-bone" {...props}>{children}</a>),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (<strong className="font-bold" {...props}>{children}</strong>),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (<em {...props}>{children}</em>),
};

function MarkdownToolbar({ onInsert }: { onInsert: (b: string, a: string, p: string) => void }) {
  const btn = 'px-2 py-1 font-mono text-[11px] border border-bone/15 hover:border-lime/50 transition-all rounded-lg cursor-pointer text-bone bg-transparent';
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      <button type="button" className={btn} onClick={() => onInsert('**', '**', 'bold')}><strong>B</strong></button>
      <button type="button" className={btn} onClick={() => onInsert('*', '*', 'italic')}><em>I</em></button>
      <button type="button" className={btn} onClick={() => onInsert('[', '](url)', 'link text')}>Link</button>
      <button type="button" className={btn} onClick={() => onInsert('## ', '', 'Heading')}>H2</button>
      <button type="button" className={btn} onClick={() => onInsert('- ', '', 'list item')}>List</button>
    </div>
  );
}

const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

export default function EventComposer({ mode, initial }: { mode: 'create' | 'edit'; initial: EventComposerInitial }) {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { worldMemberships } = useUserProfile();

  const [eventName, setEventName] = useState(initial.eventName);
  const [date, setDate] = useState(initial.dateIso);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [city, setCity] = useState(initial.city);
  const [customCity, setCustomCity] = useState('');
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [venue, setVenue] = useState(initial.venue);
  const [timezone, setTimezone] = useState(initial.timezone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/New_York'));
  const [link, setLink] = useState(initial.link);
  const [description, setDescription] = useState(initial.description);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [worldId, setWorldId] = useState(initial.worldId);
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [accent, setAccent] = useState<typeof ACCENTS[number]>(ACCENTS[0]);
  const [showMore, setShowMore] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const myWorlds = useMemo(() =>
    worldMemberships.filter((wm) => wm.role === 'world_builder' || wm.role === 'owner').map((wm) => ({ id: wm.worldId, title: wm.worldTitle })),
    [worldMemberships]);

  useEffect(() => {
    fetch('/api/events?cities=true').then((r) => r.json()).then((d) => setCities(d.cities || [])).catch(console.error);
  }, []);

  /* ── cover upload ── */
  const compressImageToBlob = (file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not decode image'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2, sy = (img.height - size) / 2;
      const out = Math.min(size, maxWidth);
      canvas.width = out; canvas.height = out;
      canvas.getContext('2d')?.drawImage(img, sx, sy, size, size, 0, 0, out, out);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas encode failed'))), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
  const getVideoDuration = (file: File): Promise<number> => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true;
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video metadata')); };
    v.src = url;
  });
  const uploadToBlob = async (file: Blob, filename: string): Promise<string> => {
    const fd = new FormData(); fd.append('file', file, filename);
    const res = await fetch('/api/events/cover-upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Upload failed');
    return json.url as string;
  };
  async function uploadFile(file: File) {
    setError('');
    const isVideo = file.type.startsWith('video/'), isGif = file.type === 'image/gif';
    try {
      setUploading(true);
      if (isVideo) {
        if (file.size > MAX_VIDEO_BYTES) { setError(`Video too large — max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`); return; }
        const d = await getVideoDuration(file);
        if (d > MAX_VIDEO_SECONDS + 0.2) { setError(`Video too long — max ${MAX_VIDEO_SECONDS}s.`); return; }
        setImageUrl(await uploadToBlob(file, file.name));
      } else if (isGif) {
        if (file.size > MAX_IMAGE_BYTES) { setError(`GIF too large — max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`); return; }
        setImageUrl(await uploadToBlob(file, file.name));
      } else if (file.type.startsWith('image/')) {
        setImageUrl(await uploadToBlob(await compressImageToBlob(file), 'cover.jpg'));
      } else setError('Unsupported file. Use JPG, PNG, GIF, or short MP4/MOV.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  }
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) await uploadFile(f); e.target.value = ''; };
  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) await uploadFile(f); };
  const coverIsVideo = imageUrl.startsWith('data:video/') || /\.(mp4|mov|webm)(\?|#|$)/i.test(imageUrl);

  const insertMarkdown = (before: string, after: string, placeholder: string) => {
    const ta = document.getElementById('composer-description') as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = description.substring(start, end);
    const text = selected || placeholder;
    setDescription(description.substring(0, start) + before + text + after + description.substring(end));
  };

  /* ── submit ── */
  const submit = async (publish: boolean) => {
    if (!user || !eventName.trim()) { setError('Event name is required'); return; }
    setSaving(publish ? 'publish' : 'draft');
    setError('');
    const payload = {
      privyId: user.id,
      eventName: eventName.trim(),
      slug: mode === 'edit' && initial.slug ? initial.slug : generateSlug(eventName),
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
      published: publish,
    };
    try {
      const res = await fetch('/api/events', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'edit' ? { ...payload, eventId: initial.eventId } : { ...payload, worldId: worldId || null }),
      });
      if (!res.ok) {
        let msg = 'Failed to save event';
        try { const d = await res.json(); msg = d.error || msg; } catch { if (res.status === 413) msg = 'Image is too large.'; }
        setError(msg); return;
      }
      const data = await res.json();
      const finalSlug = data.event?.slug ?? payload.slug;
      router.push(`/events/${finalSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally { setSaving(null); }
  };

  if (!ready) return null;
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Navigation />
        <p className="font-mono text-[13px] mb-4" style={{ color: 'var(--foreground)' }}>Please log in to {mode === 'edit' ? 'edit this event' : 'create an event'}.</p>
        <Link href="/events" className="font-mono text-[13px] underline" style={{ color: 'var(--foreground)' }}>← Back to Events</Link>
      </div>
    );
  }

  const dateChip = date ? new Date(date + 'T00:00:00').toLocaleString('en-US', { month: 'short', day: 'numeric' }) : 'Add date';
  const timeChip = startTime ? formatTimeForStorage(startTime) + (endTime ? ` – ${formatTimeForStorage(endTime)}` : '') : 'Add time';
  const cityChip = (showCustomCity ? customCity : city) || 'Add location';
  const primaryLabel = mode === 'edit' && initial.published ? 'Save →' : 'Publish →';
  const backHref = mode === 'edit' && initial.slug ? `/events/${initial.slug}` : '/events';

  return (
    <div className="min-h-screen text-bone" style={{ backgroundColor: '#0a0a0a' }}>
      <Navigation />

      {/* Sticky bar — back · status · save draft · publish */}
      <div className="sticky top-0 z-40 backdrop-blur-md border-b border-bone/[0.06]" style={{ backgroundColor: 'rgba(10,10,10,0.85)', marginTop: 'var(--nav-height, 56px)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
          <Link href={backHref} className="font-mono text-[11px] uppercase tracking-[2px] text-bone/50 hover:text-bone transition no-underline">← {mode === 'edit' ? 'Event' : 'Events'}</Link>
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/25 ml-auto">
            {mode === 'edit' ? (initial.published ? 'Published' : 'Draft') : (eventName.trim() ? 'Unsaved draft' : 'New event')}
          </span>
          <button
            onClick={() => submit(false)}
            disabled={saving !== null || !eventName.trim()}
            className="font-mono text-[11px] uppercase tracking-[2px] px-3 py-1.5 rounded-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-bone/20 text-bone/80 hover:text-bone bg-transparent"
          >
            {saving === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={() => submit(true)}
            disabled={saving !== null || !eventName.trim()}
            className="font-mono text-[11px] uppercase tracking-[2px] px-4 py-1.5 rounded-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
            style={{ backgroundColor: accent.hex, color: accent.on, boxShadow: saving === null && eventName.trim() ? `0 0 0 1px ${accent.hex}40, 0 6px 24px -8px ${accent.hex}80` : 'none' }}
          >
            {saving === 'publish' ? 'Publishing…' : primaryLabel}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Cover */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative group rounded-2xl overflow-hidden mb-8 transition-all duration-300 ${imageUrl ? 'border border-bone/10' : 'border-2 border-dashed'}`}
          style={{ aspectRatio: imageUrl ? '16 / 10' : '16 / 9', borderColor: dragOver ? accent.hex : imageUrl ? 'rgba(245,240,232,0.10)' : 'rgba(245,240,232,0.18)', backgroundColor: 'rgba(245,240,232,0.02)', boxShadow: dragOver ? `0 0 0 4px ${accent.hex}30` : 'none' }}
        >
          {imageUrl ? (
            <>
              {coverIsVideo
                ? <video src={imageUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline preload="metadata" />
                : /* eslint-disable-next-line @next/next/no-img-element */ <img src={imageUrl} alt="cover" className="w-full h-full object-cover" />}
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <label className={`font-mono text-[10px] uppercase tracking-[2px] bg-obsidian/80 backdrop-blur-sm text-bone border border-bone/20 px-3 py-1.5 rounded-sm cursor-pointer hover:border-lime/50 ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                  {uploading ? 'Uploading…' : 'Change'}
                  <input type="file" accept={COVER_ACCEPT} onChange={onPick} className="hidden" disabled={uploading} />
                </label>
                <button onClick={() => setImageUrl('')} className="font-mono text-[10px] uppercase tracking-[2px] bg-obsidian/80 backdrop-blur-sm text-bone/70 border border-bone/20 px-3 py-1.5 rounded-sm cursor-pointer hover:text-pink hover:border-pink/50">Remove</button>
              </div>
            </>
          ) : (
            <label className={`absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer ${uploading ? 'cursor-wait' : ''}`}>
              <input type="file" accept={COVER_ACCEPT} onChange={onPick} className="hidden" disabled={uploading} />
              <span className="font-basement font-black uppercase leading-none" style={{ fontSize: 'clamp(28px, 5vw, 56px)', color: accent.hex, opacity: 0.85 }}>
                {uploading ? 'Uploading…' : dragOver ? 'Drop it' : '+ Cover'}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[2px] text-bone/35 text-center px-6">drag a file · or click · jpg · gif · mp4 (≤10s)</span>
            </label>
          )}
        </div>

        {/* Title */}
        <input
          type="text" value={eventName} onChange={(e) => setEventName(e.target.value)}
          placeholder="Untitled event" autoFocus={mode === 'create'}
          className="w-full bg-transparent border-none outline-none font-basement font-black uppercase text-bone placeholder:text-bone/20 mb-5 px-0"
          style={{ fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.02em' }}
        />

        {/* Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <label className="relative inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] border border-bone/15 hover:border-lime/50 rounded-full px-3.5 py-1.5 cursor-pointer transition">
            <span className="text-[14px] leading-none">📅</span>
            <span className={date ? 'text-bone' : 'text-bone/50'}>{dateChip}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>

          <details className="relative">
            <summary className="list-none inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] border border-bone/15 hover:border-lime/50 rounded-full px-3.5 py-1.5 cursor-pointer transition">
              <span className="text-[14px] leading-none">⏰</span><span className={startTime ? 'text-bone' : 'text-bone/50'}>{timeChip}</span>
            </summary>
            <div className="absolute top-full left-0 mt-2 z-10 bg-obsidian border border-bone/15 rounded-lg p-3 shadow-2xl w-[260px]">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Start</span><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-bone/[0.04] border border-bone/15 rounded-sm px-2 py-1.5 font-mono text-[12px] text-bone outline-none focus:border-lime/50" /></div>
                <div><span className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">End</span><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-bone/[0.04] border border-bone/15 rounded-sm px-2 py-1.5 font-mono text-[12px] text-bone outline-none focus:border-lime/50" /></div>
              </div>
            </div>
          </details>

          <details className="relative">
            <summary className="list-none inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[2px] border border-bone/15 hover:border-lime/50 rounded-full px-3.5 py-1.5 cursor-pointer transition">
              <span className="text-[14px] leading-none">📍</span><span className={(city || customCity) ? 'text-bone' : 'text-bone/50'}>{cityChip}</span>
            </summary>
            <div className="absolute top-full left-0 mt-2 z-10 bg-obsidian border border-bone/15 rounded-lg p-3 shadow-2xl w-[320px]">
              <span className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">City</span>
              {!showCustomCity ? (
                <select value={city} onChange={(e) => { if (e.target.value === '__new__') { setShowCustomCity(true); setCity(''); } else setCity(e.target.value); }} className="w-full bg-bone/[0.04] border border-bone/15 rounded-sm px-2 py-1.5 font-mono text-[12px] text-bone outline-none focus:border-lime/50 cursor-pointer mb-2">
                  <option value="">Select a city…</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Add new city</option>
                </select>
              ) : (
                <div className="flex gap-1.5 mb-2">
                  <input type="text" value={customCity} onChange={(e) => setCustomCity(e.target.value)} placeholder="e.g. Los Angeles" autoFocus className="flex-1 bg-bone/[0.04] border border-bone/15 rounded-sm px-2 py-1.5 font-mono text-[12px] text-bone outline-none focus:border-lime/50" />
                  <button type="button" onClick={() => { setShowCustomCity(false); setCustomCity(''); }} className="px-2 py-1 font-mono text-[10px] uppercase tracking-[2px] text-bone/50 hover:text-bone bg-transparent border border-bone/15 rounded-sm cursor-pointer">↺</button>
                </div>
              )}
              <span className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Venue</span>
              <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. The Fonda Theatre" className="w-full bg-bone/[0.04] border border-bone/15 rounded-sm px-2 py-1.5 font-mono text-[12px] text-bone outline-none focus:border-lime/50" />
            </div>
          </details>

          <div className="inline-flex items-center gap-1 border border-bone/15 rounded-full px-2 py-1 ml-auto">
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/35 pl-1 pr-1">mood</span>
            {ACCENTS.map((a) => (
              <button key={a.name} type="button" onClick={() => setAccent(a)} title={a.name} className="w-5 h-5 rounded-full transition-all cursor-pointer border-2"
                style={{ backgroundColor: a.hex, borderColor: accent.name === a.name ? '#f5f0e8' : 'transparent', transform: accent.name === a.name ? 'scale(1.1)' : 'scale(1)' }} />
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6 border border-bone/10 hover:border-bone/20 focus-within:border-lime/40 rounded-lg overflow-hidden transition-colors">
          <div className="flex items-center justify-between bg-bone/[0.02] border-b border-bone/[0.04] px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40">Description</span>
            {description && (
              <div className="flex gap-1">
                <button type="button" onClick={() => setDescriptionPreview(false)} className={`font-mono text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm cursor-pointer border-none ${!descriptionPreview ? 'bg-bone text-obsidian' : 'bg-transparent text-bone/40 hover:text-bone'}`}>Write</button>
                <button type="button" onClick={() => setDescriptionPreview(true)} className={`font-mono text-[10px] uppercase tracking-[2px] px-2 py-0.5 rounded-sm cursor-pointer border-none ${descriptionPreview ? 'bg-bone text-obsidian' : 'bg-transparent text-bone/40 hover:text-bone'}`}>Preview</button>
              </div>
            )}
          </div>
          {!descriptionPreview ? (
            <div className="p-3">
              {description && <MarkdownToolbar onInsert={insertMarkdown} />}
              <textarea id="composer-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="What's the vibe? Who's it for? **Markdown** works." className="w-full bg-transparent border-none outline-none font-mono text-[14px] text-bone placeholder:text-bone/25 resize-none leading-relaxed" style={{ minHeight: '120px' }} />
            </div>
          ) : (
            <div className="p-3 min-h-[150px]">
              {description ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{description}</ReactMarkdown> : <p className="font-mono text-[12px] text-bone/30">Nothing to preview yet</p>}
            </div>
          )}
        </div>

        {/* More options */}
        <button type="button" onClick={() => setShowMore(!showMore)} className="font-mono text-[11px] uppercase tracking-[2px] text-bone/40 hover:text-bone transition bg-transparent border-none cursor-pointer flex items-center gap-2 mb-3">
          <span style={{ transition: 'transform 200ms', display: 'inline-block', transform: showMore ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
          {showMore ? 'Hide options' : 'More options · timezone · external link' + (mode === 'create' && myWorlds.length > 0 ? ' · world host' : '')}
        </button>
        {showMore && (
          <div className="space-y-4 border border-bone/[0.06] rounded-lg p-4 mb-6">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-bone/[0.03] border border-bone/15 focus:border-lime/40 rounded-sm px-3 py-2 font-mono text-[12px] text-bone outline-none cursor-pointer">
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
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">External event link</label>
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="w-full bg-bone/[0.03] border border-bone/15 focus:border-lime/40 rounded-sm px-3 py-2 font-mono text-[12px] text-bone outline-none placeholder:text-bone/25" />
            </div>
            {mode === 'create' && myWorlds.length > 0 && (
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[2px] text-bone/40 mb-1">Host as world</label>
                <select value={worldId} onChange={(e) => setWorldId(e.target.value)} className="w-full bg-bone/[0.03] border border-bone/15 focus:border-lime/40 rounded-sm px-3 py-2 font-mono text-[12px] text-bone outline-none cursor-pointer">
                  <option value="">Just me (personal)</option>
                  {myWorlds.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {error && <div className="mb-6 font-mono text-[12px] uppercase tracking-[2px] text-pink/90 border border-pink/30 bg-pink/[0.06] rounded-sm px-3 py-2">{error}</div>}

        {/* Edit: pointer to deeper settings */}
        {mode === 'edit' && initial.slug && (
          <Link href={`/events/${initial.slug}/manage`} className="inline-block font-mono text-[11px] uppercase tracking-[2px] text-bone/40 hover:text-bone transition no-underline">
            Guests · registration questions · co-hosts →
          </Link>
        )}
      </div>
    </div>
  );
}
