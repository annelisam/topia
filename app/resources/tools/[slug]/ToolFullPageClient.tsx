'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageShell from '../../../components/PageShell';
import ToolDetail, { ToolDetailData } from '../ToolDetail';

export default function ToolFullPageClient({ slug }: { slug: string }) {
  const router = useRouter();

  const [data, setData] = useState<ToolDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tools/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d && d.tool) setData(d as ToolDetailData); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <PageShell>
      <section className="min-h-screen bg-[var(--page-bg)] px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 hover:text-ink bg-transparent border-none cursor-pointer"
            >
              ← back
            </button>
            <Link
              href="/resources/tools"
              className="font-mono text-[11px] uppercase tracking-[2px] text-ink/40 hover:text-ink no-underline"
            >
              all tools
            </Link>
          </div>

          {loading && (
            <div className="text-center py-16">
              <span className="font-mono text-[11px] uppercase tracking-[3px] text-ink/40">loading…</span>
            </div>
          )}
          {notFound && !loading && (
            <div className="text-center py-16">
              <p className="font-mono text-[12px] uppercase tracking-[2px] text-ink/40">Tool not found.</p>
              <Link
                href="/resources/tools"
                className="inline-block mt-3 font-mono text-[11px] uppercase tracking-[2px] text-lime hover:opacity-80 no-underline"
              >
                ← back to tools
              </Link>
            </div>
          )}
          {data && !loading && <ToolDetail data={data} fullPage />}
        </div>
      </section>
    </PageShell>
  );
}
