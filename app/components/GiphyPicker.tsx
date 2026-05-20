'use client';

import { useEffect, useState, useRef } from 'react';

export interface PickedGif {
  id: string;
  url: string;        // canonical URL we persist (downsized_medium)
  previewUrl: string; // smaller preview (fixed_width_small)
  width: number;
  height: number;
  title: string;
}

interface GiphyResult {
  id: string;
  title: string;
  preview: string;
  previewWidth: string;
  previewHeight: string;
  url: string;
  width: string;
  height: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (gif: PickedGif) => void;
}

/**
 * Modal Giphy search + picker. Hits our /api/giphy/search proxy (so the
 * key stays server-side). Used by GuestbookComposer and EventComments.
 *
 * UX: search field on top, debounced, hitting empty query shows Trending.
 * Click any tile to select; calls onPick(gif) + onClose().
 */
export default function GiphyPicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    setError(null);
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(query)}&limit=24`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Giphy unavailable');
          setGifs([]);
        } else {
          setGifs(json.gifs ?? []);
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }, query ? 250 : 0);
    return () => clearTimeout(handle);
  }, [query, open]);

  // ESC + autofocus + scroll lock
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1600] flex items-center justify-center px-3 sm:px-6 py-6 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[80vh] bg-obsidian text-bone border border-bone/[0.08] rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-bone/[0.06] flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[2px] text-bone/40">via Giphy</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search gifs… (or leave blank for trending)"
            className="flex-1 bg-bone/[0.04] border border-bone/15 focus:border-lime/40 rounded-sm px-3 py-1.5 font-mono text-[12px] text-bone placeholder:text-bone/30 outline-none"
          />
          <button
            onClick={onClose}
            className="font-mono text-[14px] text-bone/40 hover:text-bone bg-transparent border-none cursor-pointer w-6 h-6 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Grid body */}
        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
          {error ? (
            <div className="text-center py-12">
              <p className="font-mono text-[11px] uppercase tracking-[2px] text-pink/80 mb-2">{error}</p>
              <p className="font-mono text-[10px] text-bone/30 max-w-xs mx-auto">
                Site admin: get a free key at developers.giphy.com and set GIPHY_API_KEY in your env.
              </p>
            </div>
          ) : loading && gifs.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-bone/30 text-center py-12">loading…</p>
          ) : gifs.length === 0 ? (
            <p className="font-mono text-[11px] uppercase tracking-[2px] text-bone/30 text-center py-12">no results</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    onPick({
                      id: g.id,
                      url: g.url,
                      previewUrl: g.preview,
                      width: parseInt(g.width, 10) || 200,
                      height: parseInt(g.height, 10) || 200,
                      title: g.title,
                    });
                    onClose();
                  }}
                  className="relative overflow-hidden rounded-sm border border-bone/10 hover:border-lime/50 bg-bone/[0.02] transition cursor-pointer p-0"
                  style={{ aspectRatio: `${g.previewWidth || 1} / ${g.previewHeight || 1}` }}
                  title={g.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.preview} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-bone/[0.06] text-center">
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-bone/25">
            Powered by GIPHY
          </span>
        </div>
      </div>
    </div>
  );
}
