'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ToolDetail, { ToolDetailData } from './ToolDetail';

interface Props {
  slug: string | null;
  onClose: () => void;
}

export default function ToolModal({ slug, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ToolDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch detail when slug changes
  useEffect(() => {
    if (!slug) { setData(null); setError(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/tools/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) { setError('Tool not found'); return null; }
        if (!r.ok) { setError('Failed to load'); return null; }
        return r.json();
      })
      .then((d) => {
        if (d && d.tool) setData(d as ToolDetailData);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [slug]);

  // ESC to close
  useEffect(() => {
    if (!slug) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slug, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!slug) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [slug]);

  if (!slug) return null;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center px-3 sm:px-6 py-6 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(10,10,10,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="bg-[var(--page-bg)] text-ink rounded-lg border border-ink/[0.08] py-12 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-ink/40">loading…</span>
          </div>
        )}
        {error && !loading && (
          <div className="bg-[var(--page-bg)] text-ink rounded-lg border border-ink/[0.08] py-12 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[3px] text-pink/80">{error}</span>
            <button
              onClick={onClose}
              className="block mx-auto mt-4 font-mono text-[10px] uppercase tracking-[2px] text-ink/40 hover:text-ink bg-transparent border-none cursor-pointer"
            >
              close
            </button>
          </div>
        )}
        {data && !loading && (
          <ToolDetail
            data={data}
            onClose={onClose}
            onExpand={() => router.push(`/resources/tools/${data.tool.slug}`)}
          />
        )}
      </div>
    </div>
  );
}
