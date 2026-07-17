'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { WorldConfig } from './worldConfig';
import { eraDateRange } from '../../../lib/eraDates';
import { POST_KINDS, postKindGlyph, linkThumbnail, type PostKind } from '../../../lib/processPosts';
import { EraDateField, ImageField, inputCls, labelCls, btnLime, btnGhost, MILESTONE_STATUSES, type Precision } from './InProcessFields';

/* The IN PROCESS roadmap — Latashá's Turn-2 mockup, minus funding.
 *
 * Structure follows her model: each PROJECT carries its own roadmap (the
 * "era" — ORBIT ONE the era IS ORBIT ONE the project), drawn as a horizontal
 * node timeline: filled orange nodes for DONE, a ring on NOW with its card
 * highlighted, hollow nodes ahead. A process log of typed posts (moment /
 * thought / link / embed) runs underneath, merged with the moments synced
 * from inprocess.world.
 *
 * This component is ALSO the editor: builders add and edit everything right
 * here on the world page — no dashboard round-trip. */

export interface EraMilestoneView { id: string; title: string; description: string | null; startDate: string | null; endDate: string | null; startPrecision: string | null; endPrecision: string | null; dateLabel: string | null; status: string; imageUrl: string | null; }
export interface EraPostView { id: string; kind: string; title: string; body: string | null; imageUrl: string | null; linkUrl: string | null; mintedUrl: string | null; createdAt: string; }
export interface EraView { id: string; title: string; description: string | null; projectId?: string | null; projectName?: string | null; projectSlug?: string | null; startDate: string | null; endDate: string | null; startPrecision: string | null; endPrecision: string | null; startLabel: string | null; endLabel: string | null; status: string; inProcessUrl: string | null; milestones: EraMilestoneView[]; posts: EraPostView[]; }
export interface ProjectOption { id: string; name: string; slug: string; }
interface Moment { id: string; name: string | null; imageUrl: string | null; mime: string | null; createdAt: string | null; collectUrl: string | null; }

const ORANGE = 'var(--orange, #FF5C34)';
const STATUS_META: Record<string, string> = { done: 'DONE ✓', now: 'NOW', upcoming: 'UPCOMING', paused: 'PAUSED' };

/* ── Timeline node ─────────────────────────────────────────────────── */
function Node({ state }: { state: 'done' | 'now' | 'future' }) {
  if (state === 'done') return <span className="w-3.5 h-3.5 rounded-full shrink-0 z-[1]" style={{ backgroundColor: ORANGE }} />;
  if (state === 'now') return <span className="w-4 h-4 rounded-full shrink-0 z-[1] border-[3px] bg-[var(--page-bg)]" style={{ borderColor: ORANGE }} />;
  return <span className="w-3.5 h-3.5 rounded-full shrink-0 z-[1] border-2 border-ink/25 bg-[var(--page-bg)]" />;
}

/* ── Milestone modal ───────────────────────────────────────────────
 * Opens in a read view (everyone sees the full milestone); builders
 * flip to the edit form with an explicit ✎ Edit. Creating a new
 * milestone goes straight to the form. */
function MilestoneModal({ eraId, existing, index, nextIndex, privyId, canEdit, onClose, onChanged }: {
  eraId: string; existing?: EraMilestoneView; index?: number; nextIndex?: number; privyId: string;
  canEdit: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>(existing ? 'view' : 'edit');
  const [draft, setDraft] = useState({
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    startPrecision: (existing?.startPrecision ?? 'month') as Precision,
    endPrecision: (existing?.endPrecision ?? 'month') as Precision,
    status: existing?.status ?? 'upcoming',
    imageUrl: existing?.imageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/worlds/eras/milestones', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { privyId, milestoneId: existing.id, ...draft }
          : { privyId, eraId, ...draft, sortOrder: nextIndex ?? 0 }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!existing) return;
    await fetch(`/api/worlds/eras/milestones?milestoneId=${existing.id}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
    onClose();
  };

  if (mode === 'view' && existing) {
    const m = existing;
    const accent = m.status === 'done' || m.status === 'now';
    return (
      <div className="fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
        <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 bg-[var(--page-bg)] border border-ink/[0.1] max-h-[88lvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px]" style={{ color: accent ? ORANGE : 'color-mix(in srgb, var(--page-text) 45%, transparent)' }}>
              {typeof index === 'number' && `M${String(index + 1).padStart(2, '0')} · `}{STATUS_META[m.status] ?? m.status.toUpperCase()}
            </p>
            <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
          </div>
          <h4 className="font-basement font-black text-[22px] uppercase leading-tight text-ink mt-2">{m.title}</h4>
          {(eraDateRange(m) ?? m.dateLabel) && (
            <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45 mt-1.5">{eraDateRange(m) ?? m.dateLabel}</p>
          )}
          {m.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={m.imageUrl} alt="" className="w-full max-h-[280px] object-cover rounded-sm mt-3" />
          )}
          {m.description && <p className="font-mono text-[13px] text-ink/70 leading-relaxed mt-3">{m.description}</p>}
          {canEdit && (
            <div className="mt-4 pt-3 border-t border-ink/[0.08]">
              <button onClick={() => setMode('edit')} className={btnGhost}>✎ Edit milestone</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2300] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 bg-[var(--page-bg)] border border-ink/[0.1] max-h-[88lvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-ink/50">
            {existing ? 'Edit milestone' : 'New milestone'}
          </p>
          <button onClick={onClose} aria-label="Close" className="bg-transparent border-none cursor-pointer text-[18px] leading-none p-0 text-ink/50">×</button>
        </div>
        <div className="space-y-2.5">
          <div>
            <label className={labelCls}>What&apos;s the milestone?</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Album Production" className={inputCls} autoFocus />
          </div>
          <div>
            <label className={labelCls}>One line about it (optional)</label>
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this stage is" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <EraDateField label="Starts" value={draft.startDate} precision={draft.startPrecision}
              onChange={(n) => setDraft({ ...draft, startDate: n.value, startPrecision: n.precision })} />
            <EraDateField label="Ends (optional)" value={draft.endDate} precision={draft.endPrecision}
              onChange={(n) => setDraft({ ...draft, endDate: n.value, endPrecision: n.precision })} />
          </div>
          <div>
            <label className={labelCls}>Where is it?</label>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
              {MILESTONE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
          {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button onClick={save} disabled={saving || !draft.title.trim()} className={btnLime}>
              {saving ? 'Saving…' : existing ? 'Save' : 'Add milestone'}
            </button>
            {existing && <button onClick={() => setMode('view')} className={btnGhost}>Cancel</button>}
            {existing && (
              confirmingDelete
                ? <button onClick={remove} className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer border-none font-bold" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Really delete?</button>
                : <button onClick={() => setConfirmingDelete(true)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Delete</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Era (roadmap) create/edit form ────────────────────────────────── */
function EraForm({ worldId, projects, existing, privyId, onClose, onChanged }: {
  worldId: string; projects: ProjectOption[]; existing?: EraView; privyId: string;
  onClose: () => void; onChanged: () => void;
}) {
  const [draft, setDraft] = useState({
    projectId: existing?.projectId ?? '',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    startDate: existing?.startDate ?? '',
    endDate: existing?.endDate ?? '',
    startPrecision: (existing?.startPrecision ?? 'month') as Precision,
    endPrecision: (existing?.endPrecision ?? 'month') as Precision,
    status: existing?.status ?? 'active',
    inProcessUrl: existing?.inProcessUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const pickProject = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    // Prefill the roadmap title with the project name until the builder types their own.
    const titleUntouched = !draft.title.trim() || projects.some((x) => x.name === draft.title);
    setDraft({ ...draft, projectId, title: titleUntouched && p ? p.name : draft.title });
  };

  const save = async () => {
    if (!draft.title.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/worlds/eras', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing
          ? { privyId, eraId: existing.id, ...draft, projectId: draft.projectId || null }
          : { privyId, worldId, ...draft, projectId: draft.projectId || null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!existing) return;
    await fetch(`/api/worlds/eras?eraId=${existing.id}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
    onClose();
  };

  return (
    <div className="border-2 border-dashed border-ink/15 rounded-lg p-4 space-y-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-ink/50">
        {existing ? 'Edit roadmap' : 'Start a roadmap'}
      </p>
      <div>
        <label className={labelCls}>Which project is this the roadmap for?</label>
        <select value={draft.projectId} onChange={(e) => pickProject(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
          <option value="">The world itself (no single project)</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Roadmap title</label>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="ORBIT ONE" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>One-liner (optional)</label>
        <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="debut album era" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <EraDateField label="Starts" value={draft.startDate} precision={draft.startPrecision}
          onChange={(n) => setDraft({ ...draft, startDate: n.value, startPrecision: n.precision })} />
        <EraDateField label="Ends (optional)" value={draft.endDate} precision={draft.endPrecision}
          onChange={(n) => setDraft({ ...draft, endDate: n.value, endPrecision: n.precision })} />
      </div>
      {existing && (
        <div>
          <label className={labelCls}>Status</label>
          <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={`${inputCls} appearance-none cursor-pointer`}>
            <option value="active">Active — shown on the world page</option>
            <option value="complete">Complete — shown as a past era</option>
            <option value="archived">Archived — hidden from visitors</option>
          </select>
        </div>
      )}
      <div>
        <label className={labelCls}>In Process link (optional — syncs your inprocess.world timeline)</label>
        <input value={draft.inProcessUrl} onChange={(e) => setDraft({ ...draft, inProcessUrl: e.target.value })} placeholder="https://inprocess.world/0x…" className={inputCls} />
      </div>
      {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={save} disabled={saving || !draft.title.trim()} className={btnLime}>
          {saving ? 'Saving…' : existing ? 'Save' : 'Create roadmap'}
        </button>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        {existing && (
          confirmingDelete
            ? <button onClick={remove} className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-sm cursor-pointer border-none font-bold" style={{ backgroundColor: '#FF5C34', color: '#fff' }}>Really delete everything?</button>
            : <button onClick={() => setConfirmingDelete(true)} className="font-mono text-[11px] uppercase underline cursor-pointer bg-transparent border-none" style={{ color: '#FF5C34' }}>Delete roadmap</button>
        )}
      </div>
    </div>
  );
}

/* ── Typed post composer (moment / thought / link / embed) ─────────── */
function PostComposer({ era, privyId, canMint, onClose, onChanged }: {
  era: EraView; privyId: string; canMint: boolean; onClose: () => void; onChanged: () => void;
}) {
  const { getAccessToken } = usePrivy();
  const blank = { kind: 'moment' as PostKind, title: '', body: '', imageUrl: '', linkUrl: '', mint: false };
  const [draft, setDraft] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const needsLink = draft.kind === 'link' || draft.kind === 'embed';
  const ready = needsLink ? !!draft.linkUrl.trim() : !!draft.title.trim();

  const post = async () => {
    if (!ready) return;
    setSaving(true); setError('');
    try {
      const accessToken = draft.mint ? await getAccessToken().catch(() => null) : null;
      const res = await fetch('/api/worlds/eras/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privyId, accessToken, eraId: era.id,
          kind: draft.kind,
          title: draft.title.trim() || undefined,
          body: draft.body.trim() || undefined,
          imageUrl: draft.imageUrl.trim() || undefined,
          linkUrl: draft.linkUrl.trim() || undefined,
          mintToInProcess: draft.mint,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not post.'); return; }
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="border-2 border-dashed border-ink/15 rounded-sm p-3 mt-3 space-y-2.5">
      <div className="flex gap-1.5 flex-wrap">
        {POST_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setDraft({ ...draft, kind: k.id })}
            className={`font-mono text-[11px] uppercase tracking-[1px] px-2.5 py-1.5 rounded-sm cursor-pointer transition ${
              draft.kind === k.id ? 'bg-lime text-obsidian font-bold border-none' : 'bg-transparent text-ink/55 border border-ink/15 hover:border-ink/40'
            }`}
          >
            {k.glyph} {k.label}
          </button>
        ))}
      </div>
      <p className="font-mono text-[10px] text-ink/35">{POST_KINDS.find((k) => k.id === draft.kind)?.hint} · posts to “{era.title}”</p>

      {draft.kind === 'moment' && (
        <>
          <ImageField value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} label="Image" />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What happened? (e.g. Mix 01 done)" className={inputCls} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={2} placeholder="A few words of process (optional)" className={inputCls} />
        </>
      )}
      {draft.kind === 'thought' && (
        <>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="this is the time when…" className={inputCls} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} placeholder="Write it out" className={inputCls} />
        </>
      )}
      {needsLink && (
        <>
          <input value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
            placeholder={draft.kind === 'link' ? 'Paste any link from the internet' : 'Paste a YouTube / SoundCloud / Spotify link'} className={inputCls} />
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title (optional — uses the site name)" className={inputCls} />
        </>
      )}

      {canMint && (
        <label className="flex items-center gap-2 font-mono text-[11px] text-ink/60 cursor-pointer">
          <input type="checkbox" checked={draft.mint} onChange={(e) => setDraft({ ...draft, mint: e.target.checked })} className="cursor-pointer" />
          ⛓ Also mint on In Process <span className="text-ink/35">(permanent, onchain)</span>
        </label>
      )}
      {error && <p className="font-mono text-[11px]" style={{ color: '#FF5C34' }}>{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={post} disabled={saving || !ready} className={btnLime}>
          {saving ? (draft.mint ? 'Posting + minting…' : 'Posting…') : 'Post'}
        </button>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Process log strip (native posts + synced moments) ─────────────── */
function ProcessLog({ era, privyId, canEdit, onChanged }: {
  era: EraView; privyId: string; canEdit: boolean; onChanged: () => void;
}) {
  const [moments, setMoments] = useState<Moment[]>([]);

  useEffect(() => {
    if (!era.inProcessUrl) return;
    let cancelled = false;
    fetch(`/api/in-process/timeline?artist=${encodeURIComponent(era.inProcessUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMoments(d?.moments ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [era.inProcessUrl]);

  const mintedUrls = new Set(era.posts.map((p) => p.mintedUrl).filter(Boolean));
  const entries = [
    ...era.posts.map((p) => ({
      id: `p-${p.id}`, postId: p.id, title: p.title,
      imageUrl: p.imageUrl ?? linkThumbnail(p.linkUrl),
      body: p.kind === 'thought' ? p.body : null,
      date: p.createdAt as string | null, href: p.linkUrl ?? p.mintedUrl, minted: !!p.mintedUrl,
      glyph: postKindGlyph(p.kind),
    })),
    ...moments
      .filter((m) => !m.collectUrl || !mintedUrls.has(m.collectUrl))
      .map((m) => ({
        id: `m-${m.id}`, postId: null as string | null, title: m.name || 'Moment',
        imageUrl: m.imageUrl, body: null as string | null,
        date: m.createdAt, href: m.collectUrl, minted: true,
        glyph: m.mime?.startsWith('audio') ? '♫' : '✦',
      })),
  ]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 14);

  const removePost = async (postId: string) => {
    await fetch(`/api/worlds/eras/posts?postId=${postId}&privyId=${encodeURIComponent(privyId)}`, { method: 'DELETE' });
    onChanged();
  };

  if (entries.length === 0 && !canEdit) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40">
          Process log{era.inProcessUrl ? ' · synced with In Process' : ''}
        </span>
        {era.inProcessUrl && (
          <a href={era.inProcessUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[1px] no-underline" style={{ color: ORANGE }}>
            Full timeline ↗
          </a>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="font-mono text-[11px] text-ink/35">Nothing logged yet — post the first update below.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {entries.map((e) => {
            const face = (
              <>
                {e.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={e.imageUrl} alt="" className="w-full h-[88px] object-cover" loading="lazy" />
                ) : e.body ? (
                  <div className="w-full h-[88px] px-2 py-1.5 bg-ink/[0.03] overflow-hidden">
                    <p className="font-mono text-[9px] leading-snug text-ink/55 line-clamp-5">{e.body}</p>
                  </div>
                ) : (
                  <div className="w-full h-[88px] flex items-center justify-center bg-ink/[0.04]">
                    <span className="font-mono text-[16px] text-ink/25">{e.glyph}</span>
                  </div>
                )}
                <div className="px-2 py-1.5">
                  <p className="font-mono text-[10px] font-bold text-ink truncate">{e.glyph} {e.title}</p>
                  <p className="font-mono text-[9px] text-ink/40">
                    {e.date && new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {e.minted && <span className="ml-1.5" style={{ color: ORANGE }}>⛓</span>}
                  </p>
                </div>
              </>
            );
            const cls = 'shrink-0 w-[132px] border border-ink/[0.08] rounded-sm overflow-hidden no-underline hover:border-ink/30 transition relative group';
            return (
              <div key={e.id} className={cls}>
                {e.href
                  ? <a href={e.href} target="_blank" rel="noopener noreferrer" className="no-underline block">{face}</a>
                  : face}
                {canEdit && e.postId && (
                  <button
                    onClick={() => removePost(e.postId!)}
                    aria-label="Delete post"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-obsidian/70 text-bone border-none cursor-pointer text-[11px] leading-none sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── One era section: header + node timeline + log ─────────────────── */
function EraSection({ era, worldId, worldSlug, projects, privyId, canEdit, canMint, onChanged, hideProjectChip }: {
  era: EraView; worldId: string; worldSlug: string; projects: ProjectOption[]; privyId: string;
  canEdit: boolean; canMint: boolean; onChanged: () => void; hideProjectChip?: boolean;
}) {
  const [editingEra, setEditingEra] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<{ existing?: EraMilestoneView; index?: number } | null>(null);
  const [composing, setComposing] = useState(false);

  const nowIndex = era.milestones.findIndex((m) => m.status === 'now');
  const lastDone = era.milestones.reduce((acc, m, i) => (m.status === 'done' ? i : acc), -1);
  const litThrough = nowIndex >= 0 ? nowIndex : lastDone; // connector lights up to here

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-ink/40">
            In Process // {era.status === 'complete' ? 'Past era' : 'Roadmap'}
            {era.status === 'archived' && <span style={{ color: ORANGE }}> · archived (only builders see this)</span>}
          </p>
          {!hideProjectChip && era.projectName && era.projectSlug && (
            <Link
              href={`/worlds/${worldSlug}/projects/${era.projectSlug}`}
              className="inline-block font-mono text-[9px] font-bold uppercase tracking-[2px] px-2 py-0.5 rounded-sm no-underline mt-1"
              style={{ backgroundColor: ORANGE, color: '#fff' }}
            >
              Project · {era.projectName}
            </Link>
          )}
          <h3 className="font-basement font-black text-[clamp(20px,3vw,30px)] uppercase leading-none text-ink mt-1">
            {era.title}
          </h3>
          {era.description && <p className="font-mono text-[12px] text-ink/55 mt-1">{era.description}</p>}
        </div>
        <div className="text-right shrink-0">
          {eraDateRange(era) && (
            <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink/45">{eraDateRange(era)}</p>
          )}
          {era.status === 'active' && nowIndex >= 0 && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[2px] mt-0.5" style={{ color: ORANGE }}>● In motion</p>
          )}
          {canEdit && (
            <button onClick={() => setEditingEra((e) => !e)} className="font-mono text-[10px] uppercase tracking-[1px] underline cursor-pointer bg-transparent border-none text-ink/50 mt-1">
              {editingEra ? 'Close' : '✎ Edit'}
            </button>
          )}
        </div>
      </div>

      {editingEra && (
        <div className="mt-3">
          <EraForm worldId={worldId} projects={projects} existing={era} privyId={privyId}
            onClose={() => setEditingEra(false)} onChanged={onChanged} />
        </div>
      )}

      {/* Node timeline — the mockup's connected dots + cards */}
      <div className="overflow-x-auto mt-5 pb-1" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex min-w-max">
          {era.milestones.map((m, i) => {
            const isNow = m.status === 'now';
            const nodeState = m.status === 'done' ? 'done' : isNow ? 'now' : 'future';
            const lit = i <= litThrough;
            return (
              <div key={m.id} className="w-[236px] shrink-0 pr-3">
                {/* node + connector */}
                <div className="relative h-5 flex items-center">
                  <Node state={nodeState} />
                  {i < era.milestones.length - 1 && (
                    <span className="absolute top-1/2 -translate-y-1/2 h-[2px]" style={{ left: 18, right: -12, backgroundColor: lit && i < litThrough + (nowIndex >= 0 ? 0 : 1) ? ORANGE : 'color-mix(in srgb, var(--page-text) 14%, transparent)' }} />
                  )}
                </div>
                {/* card */}
                <button
                  onClick={() => setMilestoneModal({ existing: m, index: i })}
                  className="block w-full text-left mt-2 rounded-sm px-3.5 py-3 bg-transparent cursor-pointer transition-colors hover:bg-ink/[0.04]"
                  style={{
                    border: `${isNow ? 2 : 1}px solid ${isNow ? ORANGE : 'color-mix(in srgb, var(--page-text) 10%, transparent)'}`,
                    opacity: m.status === 'paused' ? 0.55 : 1,
                  }}
                >
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[2px]" style={{ color: m.status === 'done' || isNow ? ORANGE : 'color-mix(in srgb, var(--page-text) 40%, transparent)' }}>
                    M{String(i + 1).padStart(2, '0')} · {STATUS_META[m.status] ?? m.status.toUpperCase()}
                  </p>
                  <p className="font-mono text-[14px] font-bold text-ink leading-tight mt-1.5">{m.title}</p>
                  {(eraDateRange(m) ?? m.dateLabel) && (
                    <p className="font-mono text-[10px] uppercase tracking-[1px] text-ink/40 mt-1">{eraDateRange(m) ?? m.dateLabel}</p>
                  )}
                  {isNow && m.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.imageUrl} alt="" className="w-full h-[96px] object-cover rounded-sm mt-2" loading="lazy" />
                  )}
                  {m.description && <p className="font-mono text-[11px] text-ink/50 mt-2 line-clamp-3">{m.description}</p>}
                </button>
              </div>
            );
          })}

          {/* Add-milestone ghost card */}
          {canEdit && (
            <div className="w-[180px] shrink-0">
              <div className="relative h-5 flex items-center">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-ink/25 shrink-0" />
              </div>
              <button
                onClick={() => setMilestoneModal({})}
                className="w-full mt-2 rounded-sm border-2 border-dashed border-ink/20 px-3.5 py-6 bg-transparent cursor-pointer font-mono text-[11px] uppercase tracking-[1px] text-ink/45 hover:border-ink/40 hover:text-ink/70 transition"
              >
                + Milestone
              </button>
            </div>
          )}
        </div>
      </div>
      {era.milestones.length === 0 && !canEdit && (
        <p className="font-mono text-[11px] text-ink/35 mt-2">No milestones yet.</p>
      )}

      <ProcessLog era={era} privyId={privyId} canEdit={canEdit} onChanged={onChanged} />

      {canEdit && !composing && (
        <button onClick={() => setComposing(true)} className={`${btnGhost} mt-3`}>+ Post an update</button>
      )}
      {composing && (
        <PostComposer era={era} privyId={privyId} canMint={canMint} onClose={() => setComposing(false)} onChanged={onChanged} />
      )}

      {milestoneModal && (
        <MilestoneModal
          eraId={era.id}
          existing={milestoneModal.existing}
          index={milestoneModal.index}
          nextIndex={era.milestones.length}
          privyId={privyId}
          canEdit={canEdit}
          onClose={() => setMilestoneModal(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ── The layer ─────────────────────────────────────────────────────── */
export default function InProcessLayer({
  eras, worldId, slug: _slug, projects, canEdit, onChanged, projectScope,
}: {
  config?: WorldConfig;
  eras: EraView[];
  worldId: string;
  slug: string;
  projects: ProjectOption[];
  canEdit: boolean;
  onChanged: () => void;
  /** When set, this renders on a project page: only that project's roadmap,
   * no project chips, and new roadmaps are created pre-linked. */
  projectScope?: string;
}) {
  const { user } = usePrivy();
  const privyId = user?.id ?? '';
  const [creating, setCreating] = useState(false);
  const [canMint, setCanMint] = useState(false);

  useEffect(() => {
    if (!canEdit || !privyId) return;
    fetch(`/api/in-process/connect?privyId=${encodeURIComponent(privyId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCanMint(!!(d?.configured && d?.connected)))
      .catch(() => {});
  }, [canEdit, privyId]);

  const scoped = projectScope ? eras.filter((e) => e.projectId === projectScope) : eras;
  const visible = scoped.filter((e) => e.status !== 'archived' || canEdit);
  const creatableProjects = projectScope ? projects.filter((p) => p.id === projectScope) : projects;

  const startCreate = useCallback(() => setCreating(true), []);

  if (visible.length === 0 && !creating) {
    return (
      <div className="bg-[var(--page-bg)] flex flex-col items-center justify-center gap-3 py-14 px-4 text-center">
        <span className="font-mono text-[11px] text-ink/30 uppercase tracking-wider">No roadmap yet</span>
        {canEdit && (
          <>
            <p className="font-mono text-[11px] text-ink/40 max-w-sm">
              A roadmap tells the story of {projectScope ? 'this project' : 'a project'} in milestones — what&apos;s done, what&apos;s in motion, what&apos;s next.
            </p>
            <button onClick={startCreate} className={btnLime}>+ Start a roadmap</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--page-bg)] p-4 flex flex-col gap-10">
      {creating && (
        <EraForm
          worldId={worldId}
          projects={creatableProjects}
          privyId={privyId}
          onClose={() => setCreating(false)}
          onChanged={onChanged}
        />
      )}
      {visible.map((era) => (
        <EraSection
          key={era.id}
          era={era}
          worldId={worldId}
          worldSlug={_slug}
          projects={projects}
          privyId={privyId}
          canEdit={canEdit}
          canMint={canMint}
          onChanged={onChanged}
          hideProjectChip={!!projectScope}
        />
      ))}
      {canEdit && !creating && visible.length > 0 && !projectScope && (
        <button onClick={startCreate} className={`${btnGhost} self-start`}>+ Roadmap for another project</button>
      )}
    </div>
  );
}
