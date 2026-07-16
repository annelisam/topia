'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorldConfig } from './worldConfig';

/* The world page's IN PROCESS tab — Latashá's Turn-2 roadmap, minus funding:
 * era header → horizontal milestone rail with statuses → process log strip
 * synced (read-only) from the era's inprocess.world timeline. Orange is the
 * In Process accent throughout, matching the mockup. */

export interface EraMilestoneView { id: string; title: string; description: string | null; dateLabel: string | null; status: string; imageUrl: string | null; }
export interface EraView { id: string; title: string; description: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: EraMilestoneView[]; }
interface Moment { id: string; name: string | null; imageUrl: string | null; mime: string | null; createdAt: string | null; collectUrl: string | null; }

const ORANGE = 'var(--orange, #FF5C34)';

const STATUS_META: Record<string, { label: string; on: boolean }> = {
  done: { label: 'DONE ✓', on: true },
  now: { label: 'NOW', on: true },
  upcoming: { label: 'UPCOMING', on: false },
  paused: { label: 'PAUSED', on: false },
};

function ProcessLog({ inProcessUrl }: { inProcessUrl: string }) {
  const [moments, setMoments] = useState<Moment[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/in-process/timeline?artist=${encodeURIComponent(inProcessUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMoments(d?.moments ?? []); })
      .catch(() => { if (!cancelled) setMoments([]); });
    return () => { cancelled = true; };
  }, [inProcessUrl]);

  // Nothing to show (still loading, no address, or upstream down) — the
  // roadmap stands on its own; the log is a bonus.
  if (!moments || moments.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40">Process log · synced from In Process</span>
        <a href={inProcessUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[1px] no-underline" style={{ color: ORANGE }}>
          Full timeline ↗
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {moments.map((m) => (
          <a
            key={m.id}
            href={m.collectUrl ?? inProcessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-[132px] border border-ink/[0.08] rounded-sm overflow-hidden no-underline hover:border-ink/30 transition"
          >
            {m.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={m.imageUrl} alt="" className="w-full h-[88px] object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-[88px] flex items-center justify-center bg-ink/[0.04]">
                <span className="font-mono text-[16px] text-ink/25">{m.mime?.startsWith('audio') ? '♫' : '✦'}</span>
              </div>
            )}
            <div className="px-2 py-1.5">
              <p className="font-mono text-[10px] font-bold text-ink truncate">{m.name || 'Moment'}</p>
              {m.createdAt && (
                <p className="font-mono text-[9px] text-ink/40">
                  {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </a>
        ))}
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
                {(era.startLabel || era.endLabel) && (
                  <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45">
                    {[era.startLabel, era.endLabel].filter(Boolean).join(' — ')}
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

            {era.inProcessUrl && <ProcessLog inProcessUrl={era.inProcessUrl} />}
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
