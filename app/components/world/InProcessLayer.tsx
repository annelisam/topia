'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorldConfig } from './worldConfig';
import { eraDateRange } from '../../../lib/eraDates';

/* The world page's IN PROCESS tab — Latashá's Turn-2 roadmap, minus funding:
 * era header → horizontal milestone rail with statuses → process log strip
 * synced (read-only) from the era's inprocess.world timeline. Orange is the
 * In Process accent throughout, matching the mockup. */

export interface EraMilestoneView { id: string; title: string; description: string | null; dateLabel: string | null; status: string; imageUrl: string | null; }
export interface EraPostView { id: string; title: string; body: string | null; imageUrl: string | null; mintedUrl: string | null; createdAt: string; }
export interface EraView { id: string; title: string; description: string | null; startDate: string | null; endDate: string | null; startPrecision: string | null; endPrecision: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: EraMilestoneView[]; posts: EraPostView[]; }
interface Moment { id: string; name: string | null; imageUrl: string | null; mime: string | null; createdAt: string | null; collectUrl: string | null; }

// Native Topia posts + synced In Process moments, one strip, newest first.
interface LogEntry { id: string; title: string; imageUrl: string | null; date: string | null; href: string | null; minted: boolean; audio?: boolean }

const ORANGE = 'var(--orange, #FF5C34)';

const STATUS_META: Record<string, { label: string; on: boolean }> = {
  done: { label: 'DONE ✓', on: true },
  now: { label: 'NOW', on: true },
  upcoming: { label: 'UPCOMING', on: false },
  paused: { label: 'PAUSED', on: false },
};

function ProcessLog({ posts, inProcessUrl }: { posts: EraPostView[]; inProcessUrl: string | null }) {
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    if (!inProcessUrl) return;
    let cancelled = false;
    fetch(`/api/in-process/timeline?artist=${encodeURIComponent(inProcessUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMoments(d?.moments ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [inProcessUrl]);

  // Merge native posts + synced moments, newest first. A post that was ALSO
  // minted appears once (the moment with the same collect URL is dropped).
  const mintedUrls = new Set(posts.map((p) => p.mintedUrl).filter(Boolean));
  const entries: LogEntry[] = [
    ...posts.map((p) => ({ id: `p-${p.id}`, title: p.title, imageUrl: p.imageUrl, date: p.createdAt, href: p.mintedUrl, minted: !!p.mintedUrl })),
    ...moments
      .filter((m) => !m.collectUrl || !mintedUrls.has(m.collectUrl))
      .map((m) => ({ id: `m-${m.id}`, title: m.name || 'Moment', imageUrl: m.imageUrl, date: m.createdAt, href: m.collectUrl, minted: true, audio: m.mime?.startsWith('audio') ?? false })),
  ]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 14);

  if (entries.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40">
          Process log{inProcessUrl ? ' · synced with In Process' : ''}
        </span>
        {inProcessUrl && (
          <a href={inProcessUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[1px] no-underline" style={{ color: ORANGE }}>
            Full timeline ↗
          </a>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {entries.map((e) => {
          const card = (
            <>
              {e.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={e.imageUrl} alt="" className="w-full h-[88px] object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-[88px] flex items-center justify-center bg-ink/[0.04]">
                  <span className="font-mono text-[16px] text-ink/25">{e.audio ? '♫' : '✦'}</span>
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="font-mono text-[10px] font-bold text-ink truncate">{e.title}</p>
                <p className="font-mono text-[9px] text-ink/40">
                  {e.date && new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {e.minted && <span className="ml-1.5" style={{ color: ORANGE }}>⛓</span>}
                </p>
              </div>
            </>
          );
          const cls = 'shrink-0 w-[132px] border border-ink/[0.08] rounded-sm overflow-hidden no-underline hover:border-ink/30 transition';
          return e.href ? (
            <a key={e.id} href={e.href} target="_blank" rel="noopener noreferrer" className={cls}>{card}</a>
          ) : (
            <div key={e.id} className={cls}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

export default function InProcessLayer({
  eras, slug, canEdit,
}: {
  config: WorldConfig;
  eras: EraView[];
  slug: string;
  canEdit: boolean;
}) {
  const visible = eras.filter((e) => e.status !== 'archived');

  if (visible.length === 0) {
    return (
      <div className="bg-[var(--page-bg)] flex flex-col items-center justify-center gap-3 py-14">
        <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No roadmap yet</span>
        {canEdit && (
          <Link href={`/dashboard/worlds/${slug}/in-process`} className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-ink/70 transition-colors border border-ink/[0.12] rounded-sm px-2.5 py-1 no-underline">
            + Start an era
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--page-bg)] p-4 flex flex-col gap-8">
      {visible.map((era) => {
        const nowIndex = era.milestones.findIndex((m) => m.status === 'now');
        return (
          <div key={era.id}>
            {/* Era header */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40">
                  In Process // {era.status === 'complete' ? 'Past era' : 'Roadmap'}
                </p>
                <h3 className="font-basement font-black text-[clamp(20px,3vw,30px)] uppercase leading-none text-ink mt-1">
                  {era.title}
                </h3>
                {era.description && <p className="font-mono text-[12px] text-ink/55 mt-1">{era.description}</p>}
              </div>
              <div className="text-right shrink-0">
                {eraDateRange(era) && (
                  <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45">
                    {eraDateRange(era)}
                  </p>
                )}
                {era.status === 'active' && era.milestones.some((m) => m.status === 'now') && (
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mt-0.5" style={{ color: ORANGE }}>● In motion</p>
                )}
              </div>
            </div>

            {/* Milestone rail — horizontal scroll; the page never scrolls sideways */}
            {era.milestones.length > 0 && (
              <div className="flex gap-3 overflow-x-auto mt-4 pb-1" style={{ scrollbarWidth: 'thin' }}>
                {era.milestones.map((m, i) => {
                  const meta = STATUS_META[m.status] ?? STATUS_META.upcoming;
                  const isNow = m.status === 'now';
                  return (
                    <div
                      key={m.id}
                      className="shrink-0 w-[218px] rounded-sm border px-3.5 py-3"
                      style={{
                        borderColor: isNow ? ORANGE : 'color-mix(in srgb, var(--page-text) 10%, transparent)',
                        borderWidth: isNow ? 2 : 1,
                        opacity: m.status === 'paused' ? 0.55 : nowIndex >= 0 && i > nowIndex && m.status === 'upcoming' ? 0.75 : 1,
                      }}
                    >
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[2px]" style={{ color: meta.on ? ORANGE : 'color-mix(in srgb, var(--page-text) 40%, transparent)' }}>
                        M{String(i + 1).padStart(2, '0')} · {meta.label}
                      </p>
                      <p className="font-mono text-[14px] font-bold text-ink leading-tight mt-1.5">{m.title}</p>
                      {m.dateLabel && <p className="font-mono text-[10px] uppercase tracking-[1px] text-ink/40 mt-1">{m.dateLabel}</p>}
                      {m.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={m.imageUrl} alt="" className="w-full h-[88px] object-cover rounded-sm mt-2" loading="lazy" />
                      )}
                      {m.description && <p className="font-mono text-[11px] text-ink/50 mt-2 line-clamp-3">{m.description}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            <ProcessLog posts={era.posts ?? []} inProcessUrl={era.inProcessUrl} />
          </div>
        );
      })}

      {canEdit && (
        <Link href={`/dashboard/worlds/${slug}/in-process`} className="font-mono text-[10px] uppercase tracking-wider text-ink/45 hover:text-ink/70 transition-colors no-underline self-start">
          ✎ Edit roadmap
        </Link>
      )}
    </div>
  );
}
