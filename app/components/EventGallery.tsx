'use client';

import { useEffect, useRef, useState } from 'react';

interface Photo {
  id: string;
  url: string;
  isVideo: boolean;
  caption: string | null;
}

interface Props {
  slug: string;
  isHost: boolean;
  privyId?: string | null;
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

// Photo album on the event page. Public read; hosts upload + remove.
// Uploads go through the shared blob endpoint, then the returned URLs are
// persisted via /api/events/gallery.
export default function EventGallery({ slug, isHost, privyId }: Props) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [canManage, setCanManage] = useState(isHost);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qs = new URLSearchParams({ slug });
    if (privyId) qs.set('viewerPrivyId', privyId);
    fetch(`/api/events/gallery?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => { setPhotos(d.photos ?? []); if (typeof d.viewerIsHost === 'boolean') setCanManage(d.viewerIsHost); })
      .catch(() => setPhotos([]));
  }, [slug, privyId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-picking the same file
    if (!files.length || !privyId) return;
    setError('');
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    try {
      const uploaded: { url: string; isVideo: boolean }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/events/cover-upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) { setError(json.error || `Couldn't upload ${file.name}`); continue; }
        uploaded.push({ url: json.url as string, isVideo: !!json.isVideo });
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      if (uploaded.length) {
        const res = await fetch('/api/events/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privyId, slug, photos: uploaded }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to save photos');
        setPhotos((prev) => [...(prev ?? []), ...(json.photos ?? [])]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const remove = async (photo: Photo) => {
    if (!privyId) return;
    // optimistic
    setPhotos((prev) => (prev ?? []).filter((p) => p.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
    try {
      const res = await fetch(`/api/events/gallery?id=${photo.id}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      // put it back on failure
      setPhotos((prev) => [...(prev ?? []), photo]);
      setError('Could not remove that photo');
    }
  };

  // Hide the section entirely for guests when the album is empty.
  if (photos === null) return null;
  if (photos.length === 0 && !canManage) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[13px] uppercase tracking-[0.15em] font-bold opacity-50" style={{ color: 'var(--foreground)' }}>
          Album
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="font-mono text-[11px] uppercase tracking-[0.12em] font-bold px-3 py-1.5 rounded-lg cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--foreground)', color: 'var(--background)' }}
          >
            {uploading
              ? progress ? `Uploading ${progress.done}/${progress.total}…` : 'Uploading…'
              : photos.length ? '+ Add photos' : '+ Upload photos'}
          </button>
        )}
        <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={onPick} />
      </div>

      {error && <p className="font-mono text-[12px] mb-3" style={{ color: '#FF5C34' }}>{error}</p>}

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-full border border-dashed rounded-xl py-10 font-mono text-[12px] uppercase tracking-[0.12em] opacity-60 cursor-pointer bg-transparent"
          style={{ borderColor: 'var(--border-color)', color: 'var(--foreground)' }}
        >
          Add photos from the event
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--border-color)' }}>
              <button type="button" onClick={() => setLightbox(p)} className="block w-full h-full p-0 border-none cursor-pointer bg-transparent">
                {p.isVideo ? (
                  <video src={p.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption ?? 'Event photo'} loading="lazy" className="w-full h-full object-cover" />
                )}
                {p.isVideo && (
                  <span className="absolute bottom-1 right-1 text-white text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>▶</span>
                )}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full font-mono text-[13px] leading-none cursor-pointer border-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[2200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-5 text-white font-mono text-[28px] bg-transparent border-none cursor-pointer" aria-label="Close">×</button>
          {lightbox.isVideo ? (
            <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[88vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt={lightbox.caption ?? 'Event photo'} className="max-w-full max-h-[88vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  );
}
